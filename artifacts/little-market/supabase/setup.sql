-- Little Market Supabase setup.
-- Run this once in the Supabase SQL Editor for the project whose URL is stored
-- in SUPER_BASE_URL. The script is safe to re-run and does not replace existing
-- product records or remove any data.

create table if not exists public.products (
  id text primary key,
  name text not null,
  category text not null,
  price_cents integer not null check (price_cents >= 0),
  image text not null,
  description text not null default '',
  badge text,
  tint text not null default '#e9dfca',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_email text not null,
  shipping_address text not null,
  total_cents integer not null check (total_cents >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null,
  product_name text not null,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null check (quantity between 1 and 50),
  line_total_cents integer not null check (line_total_cents >= 0)
);

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

revoke all on table public.products from anon, authenticated;
revoke all on table public.orders from anon, authenticated;
revoke all on table public.order_items from anon, authenticated;
grant select on table public.products to service_role;
grant all on table public.orders, public.order_items to service_role;
grant usage, select on sequence public.order_items_id_seq to service_role;

insert into public.products
  (id, name, category, price_cents, image, description, badge, tint, sort_order)
values
  ('olive-oil', 'Everyday olive oil', 'Pantry', 1400,
   'https://images.pexels.com/photos/33783/olive-oil-salad-dressing-cooking-olive.jpg?auto=compress&cs=tinysrgb&w=700',
   'A good little bottle for almost everything.', 'Shop favorite', '#d8ddbd', 1),
  ('hand-soap', 'Citrus hand soap', 'Home & care', 900,
   'https://images.pexels.com/photos/6621462/pexels-photo-6621462.jpeg?auto=compress&cs=tinysrgb&w=700',
   'Bright, clean hands. No fuss.', null, '#f2d9ba', 2),
  ('market-bag', 'Canvas market tote', 'On the go', 1800,
   'https://images.pexels.com/photos/5706277/pexels-photo-5706277.jpeg?auto=compress&cs=tinysrgb&w=700',
   'Room for the good stuff, again and again.', 'Made to last', '#e8d9bd', 3),
  ('ceramic-mug', 'Sunday morning mug', 'Kitchen', 2200,
   'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=700',
   'A comfortable favorite for slow starts.', null, '#d8e2d3', 4),
  ('dish-brush', 'Beechwood dish brush', 'Home & care', 800,
   'https://images.pexels.com/photos/4239031/pexels-photo-4239031.jpeg?auto=compress&cs=tinysrgb&w=700',
   'A small upgrade for the sink side.', null, '#ead8c3', 5),
  ('linen-towel', 'Soft linen tea towel', 'Kitchen', 1600,
   'https://images.pexels.com/photos/6044224/pexels-photo-6044224.jpeg?auto=compress&cs=tinysrgb&w=700',
   'Washes beautifully. Gets better with time.', null, '#d9e1d5', 6),
  ('granola', 'Toasted oat granola', 'Pantry', 1100,
   'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=700',
   'Crunchy clusters for an unhurried breakfast.', 'Small batch', '#e7d7b9', 7),
  ('beeswax-wraps', 'Beeswax food wraps', 'Kitchen', 1500,
   'https://images.pexels.com/photos/4099354/pexels-photo-4099354.jpeg?auto=compress&cs=tinysrgb&w=700',
   'A handy little swap for leftovers.', null, '#e5d5a7', 8)
on conflict (id) do nothing;

create or replace function public.create_little_market_order(
  p_customer_name text,
  p_customer_email text,
  p_shipping_address text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_order_id uuid;
  v_created_at timestamptz;
  v_item_count integer;
  v_unique_item_count integer;
  v_matched_item_count integer;
  v_total_cents integer;
begin
  if p_customer_name is null or length(trim(p_customer_name)) = 0
     or p_customer_email is null or length(trim(p_customer_email)) = 0
     or p_shipping_address is null or length(trim(p_shipping_address)) = 0 then
    raise exception 'Customer details are required' using errcode = '22023';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then
    raise exception 'Order must contain between 1 and 50 items' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_items) as item(product_id text, quantity integer)
    where item.product_id is null or item.quantity is null
       or item.quantity < 1 or item.quantity > 50
  ) then
    raise exception 'Order item is invalid' using errcode = '22023';
  end if;

  select
    count(*)::integer,
    count(distinct item.product_id)::integer,
    count(product.id)::integer,
    coalesce(sum(product.price_cents * item.quantity), 0)::integer
  into v_item_count, v_unique_item_count, v_matched_item_count, v_total_cents
  from jsonb_to_recordset(p_items) as item(product_id text, quantity integer)
  left join public.products as product
    on product.id = item.product_id and product.is_active = true;

  if v_item_count <> v_unique_item_count then
    raise exception 'Duplicate products are not allowed in an order' using errcode = '22023';
  end if;

  if v_matched_item_count <> v_item_count then
    raise exception 'One or more products are no longer available' using errcode = '22023';
  end if;

  insert into public.orders
    (customer_name, customer_email, shipping_address, total_cents)
  values
    (trim(p_customer_name), lower(trim(p_customer_email)), trim(p_shipping_address), v_total_cents)
  returning id, created_at into v_order_id, v_created_at;

  insert into public.order_items
    (order_id, product_id, product_name, unit_price_cents, quantity, line_total_cents)
  select
    v_order_id,
    product.id,
    product.name,
    product.price_cents,
    item.quantity,
    product.price_cents * item.quantity
  from jsonb_to_recordset(p_items) as item(product_id text, quantity integer)
  join public.products as product
    on product.id = item.product_id and product.is_active = true;

  return jsonb_build_object(
    'id', v_order_id,
    'totalCents', v_total_cents,
    'createdAt', v_created_at
  );
end;
$function$;

revoke all on function public.create_little_market_order(text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.create_little_market_order(text, text, text, jsonb)
  to service_role;
