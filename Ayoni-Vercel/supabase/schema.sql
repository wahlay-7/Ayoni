-- Run this in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  price numeric(12,2) not null check (price >= 0),
  image text not null,
  description text default '',
  sizes jsonb not null default '[]'::jsonb,
  colors jsonb not null default '[]'::jsonb,
  stock jsonb not null default '{}'::jsonb,
  image_urls jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  customer jsonb not null,
  items jsonb not null,
  total numeric(12,2) not null check (total >= 0),
  status text not null default 'pending',
  payment_status text not null default 'unpaid',
  paystack_reference text,
  payment_url text,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.orders enable row level security;

-- The Vercel API uses the server-only Supabase secret key, so browser clients
-- do not need direct table access. These grants keep the exposed schema locked down.
revoke all on table public.products from anon, authenticated;
revoke all on table public.orders from anon, authenticated;
grant all on table public.products to service_role;
grant all on table public.orders to service_role;

insert into public.products (name,category,price,image,description,sizes,colors,stock)
select 'Ayoni Signature Tee','Clothing',18500,'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80','A clean everyday cotton tee with a relaxed unisex fit.','["S","M","L","XL"]','["Black","White"]','{"S":10,"M":12,"L":10,"XL":6}'::jsonb
where not exists (select 1 from public.products);

insert into storage.buckets (id,name,public)
values ('product-images','product-images',true)
on conflict (id) do update set public=true;
