-- Migration to add shipping_address to orders and create buyer_addresses

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_address text not null default 'Pending Address';

create table if not exists public.buyer_addresses (
  id uuid primary key default gen_random_uuid(),
  buyer_identifier text not null,
  full_address text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Note: In a true migration we might update schema.sql to match,
-- but applying this directly ensures the DB gets it.
