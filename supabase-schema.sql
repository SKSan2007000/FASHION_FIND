-- ====================================================================
-- FASHIONFIND POSTGRESQL / SUPABASE PRODUCTION SCHEMA & MIGRATION
-- Compatible with PostgreSQL 14+, Supabase, and Vercel Postgres
-- ====================================================================

-- 1. PRODUCTS TABLE
create table if not exists public.products (
  id text primary key,
  title text not null,
  brand text,
  category text,
  gender text default 'MEN',
  price text default 'See latest price on Amazon',
  price_num numeric,
  image text,
  "affiliateUrl" text,
  description text,
  color text,
  fit text,
  style text,
  neck text,
  sleeve text,
  pattern text,
  material text,
  care text,
  closure text,
  country text,
  asin text,
  model text,
  rank text,
  pockets text,
  season text,
  occasion text,
  specs jsonb default '[]'::jsonb,
  "sourceText" text,
  published boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for product search and filtering
create index if not exists idx_products_published on public.products(published);
create index if not exists idx_products_gender on public.products(gender);
create index if not exists idx_products_category on public.products(category);
create index if not exists idx_products_asin on public.products(asin);

-- 2. USERS TABLE (Application-level users & RBAC)
create table if not exists public.users (
  id text primary key,
  email text unique not null,
  password_hash text not null,
  name text,
  role text not null default 'USER', -- 'USER' or 'ADMIN'
  account_status text not null default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_users_email on public.users(email);
create index if not exists idx_users_role on public.users(role);

-- 3. USER STYLING PREFERENCES
create table if not exists public.user_preferences (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  gender text,
  occasion text,
  style_direction text,
  preferred_color text,
  budget text,
  skin_tone text,
  preferences jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint uq_user_preferences unique (user_id)
);

create index if not exists idx_user_preferences_user_id on public.user_preferences(user_id);

-- 4. SITE EVENTS & GENUINE ANALYTICS
create table if not exists public.site_events (
  id bigint generated always as identity primary key,
  event_type text not null, -- 'visit', 'page_view', 'product_view', 'affiliate_click', 'recommendation_run', 'sign_in', 'sign_up'
  product_id text,
  session_id text,
  user_id text,
  path text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_site_events_type on public.site_events(event_type);
create index if not exists idx_site_events_created_at on public.site_events(created_at);
create index if not exists idx_site_events_product_id on public.site_events(product_id);

-- 5. AUDIT LOGS (Security & compliance tracking)
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id text,
  actor_email text,
  action text not null,
  target_resource text,
  outcome text not null, -- 'SUCCESS', 'DENIED', 'ERROR'
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_audit_logs_actor on public.audit_logs(actor_id);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at);

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
alter table public.products enable row level security;
alter table public.users enable row level security;
alter table public.user_preferences enable row level security;
alter table public.site_events enable row level security;
alter table public.audit_logs enable row level security;

-- Public read access to published products only
drop policy if exists "public read products" on public.products;
create policy "public read products" on public.products for select using (published = true);

-- Authenticated / service role management of products
drop policy if exists "authenticated manage products" on public.products;
create policy "authenticated manage products" on public.products for all to authenticated using (true) with check (true);

-- Public insert of analytics events
drop policy if exists "public insert events" on public.site_events;
create policy "public insert events" on public.site_events for insert with check (true);

-- Authenticated read of events (for analytics)
drop policy if exists "authenticated read events" on public.site_events;
create policy "authenticated read events" on public.site_events for select to authenticated using (true);

-- Storage bucket configuration for product images
insert into storage.buckets (id, name, public) values ('products', 'products', true) on conflict (id) do nothing;
drop policy if exists "public read product images" on storage.objects;
create policy "public read product images" on storage.objects for select using (bucket_id = 'products');
drop policy if exists "authenticated upload product images" on storage.objects;
create policy "authenticated upload product images" on storage.objects for insert to authenticated with check (bucket_id = 'products');
