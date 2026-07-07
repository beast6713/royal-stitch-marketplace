create extension if not exists "pgcrypto";

-- Catalog shape and read-heavy indexes.
alter table public.products add column if not exists category text;

update public.products p
set category = c.name
from public.categories c
where p.category_id = c.id
  and p.category is null;

create index if not exists idx_products_category_id_created_at
  on public.products(category_id, created_at desc);

create index if not exists idx_products_category_created_at
  on public.products(category, created_at desc);

create index if not exists idx_orders_user_created_at
  on public.orders(buyer_identifier, created_at desc);

create index if not exists idx_order_items_seller_id
  on public.order_items(seller_id);

create index if not exists idx_telemetry_product_event_created_at
  on public.telemetry_events(product_id, event_name, created_at desc);

-- Order/payment lifecycle hardening.
alter table public.orders
  add column if not exists shipping_address text,
  add column if not exists razorpay_payment_id text,
  add column if not exists idempotency_key text,
  add column if not exists payment_provider text,
  add column if not exists payment_attempts integer not null default 0,
  add column if not exists payment_expires_at timestamptz,
  add column if not exists paid_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists failure_reason text;

create unique index if not exists idx_orders_idempotency_key
  on public.orders(idempotency_key)
  where idempotency_key is not null;

create unique index if not exists idx_orders_razorpay_order_id
  on public.orders(razorpay_order_id)
  where razorpay_order_id is not null;

update public.orders
set status = case
  when status = 'processing' then 'paid'
  when status = 'completed' then 'delivered'
  when status = 'returned' then 'refunded'
  else status
end
where status in ('processing', 'completed', 'returned');

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check
  check (status in ('pending', 'paid', 'shipped', 'delivered', 'refunded', 'cancelled', 'payment_failed'));

alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders
  add constraint orders_payment_status_check
  check (payment_status in ('pending', 'authorized', 'paid', 'cod_due', 'failed', 'abandoned', 'refunded'));

alter table public.order_items drop constraint if exists order_items_shipping_status_check;
alter table public.order_items
  add constraint order_items_shipping_status_check
  check (shipping_status in ('pending', 'label_created', 'in_transit', 'out_for_delivery', 'delivered', 'delayed', 'returned'));

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null check (provider in ('razorpay', 'cod')),
  razorpay_order_id text,
  razorpay_payment_id text,
  amount numeric(10, 2) not null default 0,
  currency text not null default 'INR',
  status text not null check (status in ('created', 'authorized', 'captured', 'failed', 'refunded')),
  idempotency_key text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

do $$
begin
  alter table public.payments add constraint payments_razorpay_payment_id_key unique (razorpay_payment_id);
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter table public.payments add constraint payments_idempotency_key_key unique (idempotency_key);
exception
  when duplicate_object then null;
end;
$$;

create unique index if not exists idx_payments_razorpay_payment_id
  on public.payments(razorpay_payment_id)
  where razorpay_payment_id is not null;

create unique index if not exists idx_payments_idempotency_key
  on public.payments(idempotency_key)
  where idempotency_key is not null;

create index if not exists idx_payments_order_id
  on public.payments(order_id);

create table if not exists public.payment_webhook_events (
  event_id text primary key,
  provider text not null check (provider in ('razorpay')),
  event_name text not null,
  razorpay_order_id text,
  razorpay_payment_id text,
  payload jsonb not null,
  status text not null default 'received' check (status in ('received', 'processed', 'failed')),
  error text,
  received_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz
);

create index if not exists idx_payment_webhooks_order_id
  on public.payment_webhook_events(razorpay_order_id);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_identifier text,
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_audit_logs_target
  on public.audit_logs(target_type, target_id, created_at desc);

create table if not exists public.background_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null check (job_type in ('order_confirmation_email', 'payment_reconciliation', 'release_abandoned_order')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  attempts integer not null default 0,
  run_after timestamptz not null default timezone('utc', now()),
  locked_at timestamptz,
  completed_at timestamptz,
  last_error text,
  idempotency_key text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

do $$
begin
  alter table public.background_jobs add constraint background_jobs_idempotency_key_key unique (idempotency_key);
exception
  when duplicate_object then null;
end;
$$;

create unique index if not exists idx_background_jobs_idempotency_key
  on public.background_jobs(idempotency_key)
  where idempotency_key is not null;

create index if not exists idx_background_jobs_due
  on public.background_jobs(status, run_after);

drop trigger if exists set_payments_updated_at on public.payments;
create trigger set_payments_updated_at
  before update on public.payments
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_background_jobs_updated_at on public.background_jobs;
create trigger set_background_jobs_updated_at
  before update on public.background_jobs
  for each row execute procedure public.set_updated_at();

alter table public.payments enable row level security;
alter table public.payment_webhook_events enable row level security;
alter table public.audit_logs enable row level security;
alter table public.background_jobs enable row level security;

create or replace function public.place_order_transaction(
  p_idempotency_key text,
  p_buyer_identifier text,
  p_buyer_name text,
  p_subtotal numeric,
  p_shipping_fee numeric,
  p_total numeric,
  p_payment_method text,
  p_shipping_address text,
  p_cart_items jsonb,
  p_share_channel text default null,
  p_razorpay_order_id text default null,
  p_reseller_margin_total numeric default 0
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_order_id uuid;
  v_item record;
  v_current_stock integer;
begin
  if p_idempotency_key is not null then
    select id into v_order_id
    from public.orders
    where idempotency_key = p_idempotency_key;

    if found then
      return v_order_id;
    end if;
  end if;

  if p_payment_method not in ('cod', 'upi', 'card') then
    raise exception 'Unsupported payment method %', p_payment_method;
  end if;

  if p_cart_items is null or jsonb_typeof(p_cart_items) <> 'array' or jsonb_array_length(p_cart_items) = 0 then
    raise exception 'Cannot place an order with an empty cart';
  end if;

  for v_item in
    select * from jsonb_to_recordset(p_cart_items) as x(product_id uuid, quantity integer)
  loop
    select stock_quantity into v_current_stock
    from public.products
    where id = v_item.product_id
    for update;

    if v_current_stock is null then
      raise exception 'Product % not found', v_item.product_id;
    end if;

    if v_current_stock < v_item.quantity then
      raise exception 'Insufficient stock for product %', v_item.product_id;
    end if;
  end loop;

  insert into public.orders (
    buyer_identifier,
    buyer_name,
    status,
    subtotal,
    shipping_fee,
    total,
    payment_method,
    payment_status,
    razorpay_order_id,
    payment_provider,
    payment_expires_at,
    shipping_address,
    share_channel,
    reseller_margin_total,
    idempotency_key
  ) values (
    p_buyer_identifier,
    p_buyer_name,
    'pending',
    p_subtotal,
    p_shipping_fee,
    p_total,
    p_payment_method,
    case when p_payment_method = 'cod' then 'cod_due' else 'pending' end,
    p_razorpay_order_id,
    case when p_payment_method = 'cod' then 'cod' when p_razorpay_order_id is not null then 'razorpay' else null end,
    case when p_payment_method = 'cod' then null else timezone('utc', now()) + interval '20 minutes' end,
    p_shipping_address,
    p_share_channel,
    coalesce(p_reseller_margin_total, 0),
    p_idempotency_key
  )
  returning id into v_order_id;

  for v_item in
    select * from jsonb_to_recordset(p_cart_items) as x(
      product_id uuid,
      seller_id text,
      product_name text,
      quantity integer,
      unit_price numeric,
      selected_color text,
      selected_size text,
      custom_margin numeric
    )
  loop
    insert into public.order_items (
      order_id,
      seller_id,
      product_id,
      product_name,
      quantity,
      unit_price,
      selected_color,
      selected_size,
      custom_margin,
      shipping_status
    ) values (
      v_order_id,
      v_item.seller_id,
      v_item.product_id,
      v_item.product_name,
      v_item.quantity,
      v_item.unit_price,
      v_item.selected_color,
      v_item.selected_size,
      coalesce(v_item.custom_margin, 0),
      'pending'
    );

    update public.products
    set
      stock_quantity = stock_quantity - v_item.quantity,
      status = case
        when stock_quantity - v_item.quantity <= 0 then 'out_of_stock'
        when stock_quantity - v_item.quantity <= coalesce(reorder_threshold, 2) then 'low_stock'
        else 'in_stock'
      end,
      updated_at = timezone('utc', now())
    where id = v_item.product_id;
  end loop;

  if p_payment_method = 'cod' then
    delete from public.cart_items
    where cart_id = (select id from public.cart where buyer_identifier = p_buyer_identifier)
      and saved_for_later = false;
  end if;

  return v_order_id;
end;
$$;

create or replace function public.confirm_payment_transaction(
  p_order_id uuid,
  p_buyer_identifier text,
  p_razorpay_order_id text,
  p_razorpay_payment_id text,
  p_raw_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_order public.orders%rowtype;
  v_existing_payment_order_id uuid;
begin
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order % not found', p_order_id;
  end if;

  if p_buyer_identifier is not null and v_order.buyer_identifier <> p_buyer_identifier then
    raise exception 'Order does not belong to the current buyer';
  end if;

  if v_order.status in ('cancelled', 'refunded') then
    raise exception 'Order % is no longer payable and requires manual reconciliation', p_order_id;
  end if;

  if v_order.razorpay_order_id is not null and v_order.razorpay_order_id <> p_razorpay_order_id then
    raise exception 'Razorpay order id mismatch';
  end if;

  select order_id into v_existing_payment_order_id
  from public.payments
  where razorpay_payment_id = p_razorpay_payment_id;

  if v_existing_payment_order_id is not null and v_existing_payment_order_id <> p_order_id then
    raise exception 'Razorpay payment id already belongs to another order';
  end if;

  insert into public.payments (
    order_id,
    provider,
    razorpay_order_id,
    razorpay_payment_id,
    amount,
    currency,
    status,
    idempotency_key,
    raw_payload
  ) values (
    p_order_id,
    'razorpay',
    p_razorpay_order_id,
    p_razorpay_payment_id,
    v_order.total,
    'INR',
    'captured',
    'razorpay-payment:' || p_razorpay_payment_id,
    p_raw_payload
  )
  on conflict (razorpay_payment_id)
  do update set
    status = 'captured',
    raw_payload = public.payments.raw_payload || excluded.raw_payload,
    updated_at = timezone('utc', now());

  update public.orders
  set
    status = 'paid',
    payment_status = 'paid',
    payment_provider = 'razorpay',
    razorpay_order_id = p_razorpay_order_id,
    razorpay_payment_id = p_razorpay_payment_id,
    paid_at = coalesce(paid_at, timezone('utc', now())),
    failure_reason = null,
    updated_at = timezone('utc', now())
  where id = p_order_id;

  delete from public.cart_items
  where cart_id = (select id from public.cart where buyer_identifier = v_order.buyer_identifier)
    and saved_for_later = false;

  return p_order_id;
end;
$$;

create or replace function public.expire_pending_order(
  p_order_id uuid,
  p_reason text default 'payment_abandoned'
)
returns void
language plpgsql
security definer
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    return;
  end if;

  if v_order.payment_status in ('paid', 'cod_due') or v_order.status not in ('pending', 'payment_failed') then
    return;
  end if;

  update public.products p
  set
    stock_quantity = p.stock_quantity + oi.quantity,
    status = case
      when p.stock_quantity + oi.quantity <= 0 then 'out_of_stock'
      when p.stock_quantity + oi.quantity <= coalesce(p.reorder_threshold, 2) then 'low_stock'
      else 'in_stock'
    end,
    updated_at = timezone('utc', now())
  from public.order_items oi
  where oi.order_id = p_order_id
    and oi.product_id = p.id;

  update public.orders
  set
    status = 'cancelled',
    payment_status = 'abandoned',
    cancelled_at = timezone('utc', now()),
    failure_reason = p_reason,
    updated_at = timezone('utc', now())
  where id = p_order_id
    and payment_status <> 'paid';
end;
$$;

create or replace function public.reconcile_payment_state(p_order_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order
  from public.orders
  where id = p_order_id;

  if not found then
    return;
  end if;

  if v_order.payment_status = 'pending'
    and v_order.payment_expires_at is not null
    and v_order.payment_expires_at <= timezone('utc', now()) then
    perform public.expire_pending_order(p_order_id, 'payment_timeout');
  end if;
end;
$$;

create or replace function public.get_trending_products(
  p_limit integer default 12,
  p_window_days integer default 7
)
returns table (
  product_id uuid,
  views bigint,
  carts bigint,
  purchases bigint,
  score numeric
)
language sql
security definer
as $$
  with telemetry_scores as (
    select
      product_id,
      count(*) filter (where event_name in ('product.viewed', 'page.viewed')) as views,
      count(*) filter (where event_name = 'cart.added') as carts,
      count(*) filter (where event_name in ('purchase.completed', 'checkout.completed')) as purchases
    from public.telemetry_events
    where product_id is not null
      and created_at >= timezone('utc', now()) - make_interval(days => greatest(p_window_days, 1))
    group by product_id
  )
  select
    product_id,
    views,
    carts,
    purchases,
    (views * 1.0 + carts * 4.0 + purchases * 12.0) as score
  from telemetry_scores
  order by score desc, purchases desc, views desc
  limit greatest(p_limit, 1);
$$;
