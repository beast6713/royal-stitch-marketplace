create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text unique not null,
  full_name text not null,
  email text,
  role text not null default 'buyer' check (role in ('buyer', 'seller', 'admin')),
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.sellers (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references public.profiles(id) on delete cascade,
  store_name text not null,
  rating numeric(3, 2) default 0,
  total_sales numeric(10, 2) default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.categories (
  id serial primary key,
  name text not null unique,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id text not null references public.sellers(id) on delete cascade,
  category_id integer references public.categories(id),
  name text not null,
  description text not null,
  price numeric(10, 2) not null check (price > 0),
  material text not null check (material in ('Wool', 'Cotton', 'Acrylic')),
  yarn_type text not null,
  image_url text not null,
  handmade boolean not null default true,
  compare_at_price numeric(10, 2),
  stock_quantity integer not null default 0,
  reserved_quantity integer not null default 0,
  reorder_threshold integer not null default 2,
  status text not null default 'in_stock' check (status in ('in_stock', 'low_stock', 'out_of_stock', 'preorder')),
  average_rating numeric(3, 2),
  review_count integer not null default 0,
  discount_ends_at timestamptz,
  quality_score integer,
  counterfeit_risk text check (counterfeit_risk in ('low', 'medium', 'high')),
  price_drop_percent integer,
  back_in_stock_subscribers integer not null default 0,
  tags text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.alert_subscriptions (
  id uuid primary key default gen_random_uuid(),
  buyer_identifier text not null,
  product_id uuid not null references public.products(id) on delete cascade,
  alert_type text not null check (alert_type in ('back_in_stock', 'price_drop')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.buyer_product_signals (
  id uuid primary key default gen_random_uuid(),
  buyer_identifier text not null,
  product_id uuid not null references public.products(id) on delete cascade,
  signal_type text not null check (signal_type in ('wishlist', 'save_for_later', 'back_in_stock', 'price_drop', 'recently_viewed')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.cart (
  id uuid primary key default gen_random_uuid(),
  buyer_identifier text unique not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.cart(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  selected_color text not null default '',
  selected_size text not null default '',
  custom_margin numeric(10, 2) not null default 0,
  saved_for_later boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(cart_id, product_id, selected_color, selected_size)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_identifier text not null,
  buyer_name text not null,
  status text not null check (status in ('pending', 'processing', 'completed', 'cancelled')),
  subtotal numeric(10, 2) not null default 0,
  shipping_fee numeric(10, 2) not null default 0,
  total numeric(10, 2) not null default 0,
  payment_method text check (payment_method in ('cod', 'upi', 'card')),
  payment_status text check (payment_status in ('pending', 'paid', 'cod_due', 'failed')),
  razorpay_order_id text,
  share_channel text check (share_channel in ('whatsapp', 'instagram', 'link')),
  reseller_margin_total numeric(10, 2) not null default 0,
  shipping_address text not null default 'Pending Address',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.buyer_addresses (
  id uuid primary key default gen_random_uuid(),
  buyer_identifier text not null,
  full_address text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  seller_id text not null references public.sellers(id),
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null default 1,
  unit_price numeric(10, 2) not null default 0,
  selected_color text,
  selected_size text,
  custom_margin numeric(10, 2) not null default 0,
  shipping_status text not null default 'pending' check (shipping_status in ('pending', 'label_created', 'in_transit', 'out_for_delivery', 'delivered', 'delayed', 'returned')),
  tracking_number text,
  courier_name text,
  estimated_delivery_at timestamptz,
  delivered_at timestamptz
);

create table if not exists public.return_requests (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  buyer_identifier text not null,
  status text not null check (status in ('requested', 'approved', 'picked_up', 'refunded', 'rejected')),
  refund_status text not null check (refund_status in ('not_started', 'in_review', 'processed', 'paid')),
  reason text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.support_cases (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  buyer_identifier text not null,
  seller_id text,
  case_type text not null check (case_type in ('protection', 'return', 'dispute', 'shipment')),
  status text not null check (status in ('open', 'in_review', 'resolved')),
  title text not null,
  description text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.price_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  price numeric(10, 2) not null,
  compare_at_price numeric(10, 2),
  recorded_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  seller_id text references public.sellers(id),
  code text unique not null,
  label text not null,
  discount_type text not null check (discount_type in ('percent', 'flat')),
  discount_value numeric(10, 2) not null,
  stackable boolean not null default false,
  minimum_order_value numeric(10, 2),
  active boolean not null default true,
  starts_at timestamptz not null default timezone('utc', now()),
  ends_at timestamptz not null
);

create table if not exists public.telemetry_events (
  id uuid primary key default gen_random_uuid(),
  buyer_identifier text,
  seller_id text references public.sellers(id),
  order_id uuid references public.orders(id) on delete set null,
  event_name text not null,
  page text not null,
  product_id uuid references public.products(id) on delete set null,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  buyer_identifier text not null,
  buyer_name text not null,
  rating integer not null check (rating between 1 and 5),
  title text not null,
  body text not null,
  verified_purchase boolean not null default false,
  media_url text,
  size_insight text,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();

drop trigger if exists set_sellers_updated_at on public.sellers;
create trigger set_sellers_updated_at before update on public.sellers for each row execute procedure public.set_updated_at();

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at before update on public.products for each row execute procedure public.set_updated_at();

drop trigger if exists set_cart_updated_at on public.cart;
create trigger set_cart_updated_at before update on public.cart for each row execute procedure public.set_updated_at();

drop trigger if exists set_cart_items_updated_at on public.cart_items;
create trigger set_cart_items_updated_at before update on public.cart_items for each row execute procedure public.set_updated_at();

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at before update on public.orders for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.sellers enable row level security;
alter table public.products enable row level security;
alter table public.cart enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Seller policies
drop policy if exists "Sellers can manage their products" on public.products;
create policy "Sellers can manage their products" on public.products
for all using (seller_id in (select id from public.sellers where user_id = (select id from public.profiles where clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub')));

-- Buyer policies
drop policy if exists "Buyers can manage their carts" on public.cart;
create policy "Buyers can manage their carts" on public.cart
for all using (buyer_identifier = current_setting('request.jwt.claims', true)::json->>'sub');

drop policy if exists "Buyers can manage their cart items" on public.cart_items;
create policy "Buyers can manage their cart items" on public.cart_items
for all using (cart_id in (select id from public.cart where buyer_identifier = current_setting('request.jwt.claims', true)::json->>'sub'));

drop policy if exists "Buyers can view their own orders" on public.orders;
create policy "Buyers can view their own orders" on public.orders
for select using (buyer_identifier = current_setting('request.jwt.claims', true)::json->>'sub');

drop policy if exists "Sellers can view their order items" on public.order_items;
create policy "Sellers can view their order items" on public.order_items
for select using (seller_id in (select id from public.sellers where user_id = (select id from public.profiles where clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub')));
