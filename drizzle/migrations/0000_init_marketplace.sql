-- ===== enums =====
create type public.app_role as enum ('admin','user');
create type public.order_status as enum ('pending','processing','completed','cancelled','refunded');
create type public.payment_status as enum ('unpaid','paid','failed','refunded');
create type public.delivery_status as enum ('pending','delivered','failed');

-- ===== profiles =====
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  sound_enabled boolean not null default true,
  email_notifications boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);

-- ===== roles =====
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles read" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- ===== settings (single row) =====
create table public.app_settings (
  id boolean primary key default true check (id),
  store_name text not null default '77 Resells',
  store_description text not null default 'A curated marketplace for digital goods, accounts and services.',
  logo_url text,
  favicon_url text,
  support_email text not null default 'support@77resells.com',
  admin_email text not null default 'vynesgithuv@gmail.com',
  currency text not null default 'USD',
  discord_url text,
  twitter_url text,
  terms_content text,
  privacy_content text,
  refund_content text,
  updated_at timestamptz not null default now()
);
grant select on public.app_settings to anon, authenticated;
grant all on public.app_settings to service_role;
alter table public.app_settings enable row level security;
create policy "settings public read" on public.app_settings for select to anon, authenticated using (true);
insert into public.app_settings (id) values (true);

-- ===== new user trigger =====
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare cfg_admin text;
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  ) on conflict (id) do nothing;

  select admin_email into cfg_admin from public.app_settings where id = true;
  if cfg_admin is not null and lower(cfg_admin) = lower(coalesce(new.email,'')) then
    insert into public.user_roles (user_id, role) values (new.id, 'admin') on conflict do nothing;
  else
    insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  end if;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- ===== categories =====
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.categories to anon, authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "categories public read" on public.categories for select to anon, authenticated using (active);
create policy "categories admin all" on public.categories for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
grant insert, update, delete on public.categories to authenticated;

insert into public.categories (name, slug, sort_order) values
  ('Gaming','gaming',1),('Accounts','accounts',2),('Digital Goods','digital-goods',3),('Services','services',4),('Other','other',5);

-- ===== providers =====
create table public.providers (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  logo_url text,
  active boolean not null default true,
  sort_order int not null default 0
);
grant select on public.providers to anon, authenticated;
grant all on public.providers to service_role;
alter table public.providers enable row level security;
create policy "providers public read" on public.providers for select to anon, authenticated using (true);
insert into public.providers (key, name, sort_order) values ('litbuy','LitBuy',1),('kakobuy','KakoBuy',2),('oopbuy','OopBuy',3);

-- ===== products =====
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  short_description text,
  description text,
  price_cents int not null check (price_cents >= 0),
  compare_at_cents int,
  image_url text,
  images jsonb not null default '[]'::jsonb,
  category_id uuid references public.categories(id) on delete set null,
  stock int,
  available boolean not null default true,
  published boolean not null default false,
  terms text,
  purchase_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "products public read" on public.products for select to anon, authenticated using (published);
create policy "products admin all" on public.products for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- public availability of providers per product
create table public.product_providers (
  product_id uuid not null references public.products(id) on delete cascade,
  provider_id uuid not null references public.providers(id) on delete cascade,
  enabled boolean not null default true,
  primary key (product_id, provider_id)
);
grant select on public.product_providers to anon, authenticated;
grant insert, update, delete on public.product_providers to authenticated;
grant all on public.product_providers to service_role;
alter table public.product_providers enable row level security;
create policy "pp public read" on public.product_providers for select to anon, authenticated using (enabled);
create policy "pp admin all" on public.product_providers for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- PRIVATE delivery links: never readable by normal users
create table public.product_provider_links (
  product_id uuid not null references public.products(id) on delete cascade,
  provider_id uuid not null references public.providers(id) on delete cascade,
  url text not null,
  primary key (product_id, provider_id)
);
grant all on public.product_provider_links to service_role;
alter table public.product_provider_links enable row level security;
create policy "links admin only" on public.product_provider_links for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
grant select, insert, update, delete on public.product_provider_links to authenticated;

-- ===== coupons =====
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null default 'percent' check (discount_type in ('percent','fixed')),
  discount_value numeric not null check (discount_value > 0),
  min_purchase_cents int not null default 0,
  max_discount_cents int,
  expires_at timestamptz,
  usage_limit int,
  per_user_limit int,
  used_count int not null default 0,
  active boolean not null default true,
  first_order_only boolean not null default false,
  product_ids uuid[] not null default '{}',
  category_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
grant all on public.coupons to service_role;
grant select, insert, update, delete on public.coupons to authenticated;
alter table public.coupons enable row level security;
create policy "coupons admin all" on public.coupons for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.coupon_usage (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid,
  discount_cents int not null default 0,
  created_at timestamptz not null default now()
);
grant all on public.coupon_usage to service_role;
grant select on public.coupon_usage to authenticated;
alter table public.coupon_usage enable row level security;
create policy "usage own read" on public.coupon_usage for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));

-- ===== orders =====
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  status public.order_status not null default 'pending',
  payment_status public.payment_status not null default 'unpaid',
  delivery_status public.delivery_status not null default 'pending',
  subtotal_cents int not null default 0,
  discount_cents int not null default 0,
  total_cents int not null default 0,
  currency text not null default 'USD',
  coupon_code text,
  stripe_session_id text,
  stripe_payment_intent text,
  admin_notes text,
  last_delivery_email_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "orders own read" on public.orders for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "orders admin update" on public.orders for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
grant update on public.orders to authenticated;

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  product_image text,
  unit_price_cents int not null,
  quantity int not null default 1,
  provider_id uuid references public.providers(id) on delete set null,
  provider_name text,
  delivery_url text
);
grant select on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "items own read" on public.order_items for select to authenticated using (
  exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.has_role(auth.uid(),'admin')))
);

-- ===== favorites =====
create table public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
grant select, insert, delete on public.favorites to authenticated;
grant all on public.favorites to service_role;
alter table public.favorites enable row level security;
create policy "favorites own" on public.favorites for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ===== notifications =====
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'info',
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "notifications own read" on public.notifications for select to authenticated using (auth.uid() = user_id);
create policy "notifications own update" on public.notifications for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ===== support tickets =====
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  subject text not null,
  message text not null,
  order_number text,
  status text not null default 'open',
  admin_reply text,
  created_at timestamptz not null default now()
);
grant select on public.support_tickets to authenticated;
grant all on public.support_tickets to service_role;
alter table public.support_tickets enable row level security;
create policy "tickets own read" on public.support_tickets for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "tickets admin update" on public.support_tickets for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
grant update on public.support_tickets to authenticated;

create index on public.products (category_id);
create index on public.products (published, available);
create index on public.orders (user_id, created_at desc);
create index on public.order_items (order_id);
create index on public.notifications (user_id, read);
