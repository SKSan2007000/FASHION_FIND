create table if not exists public.products (
 id text primary key,
 title text not null,
 brand text,
 category text,
 price text,
 image text,
 "affiliateUrl" text,
 description text,
 color text, fit text, style text, neck text, sleeve text, pattern text, material text, care text, closure text,
 country text, asin text, model text, rank text, pockets text, season text, occasion text,
 specs jsonb default '[]'::jsonb,
 "sourceText" text,
 published boolean default true,
 created_at timestamptz default now()
);
create table if not exists public.site_events (
 id bigint generated always as identity primary key,
 event_type text not null,
 product_id text,
 created_at timestamptz default now()
);
alter table public.products enable row level security;
alter table public.site_events enable row level security;
drop policy if exists "public read products" on public.products;
create policy "public read products" on public.products for select using (published = true);
drop policy if exists "authenticated manage products" on public.products;
create policy "authenticated manage products" on public.products for all to authenticated using (true) with check (true);
drop policy if exists "public insert events" on public.site_events;
create policy "public insert events" on public.site_events for insert with check (true);
drop policy if exists "authenticated read events" on public.site_events;
create policy "authenticated read events" on public.site_events for select to authenticated using (true);
insert into storage.buckets (id,name,public) values ('products','products',true) on conflict (id) do nothing;
drop policy if exists "public read product images" on storage.objects;
create policy "public read product images" on storage.objects for select using (bucket_id='products');
drop policy if exists "authenticated upload product images" on storage.objects;
create policy "authenticated upload product images" on storage.objects for insert to authenticated with check (bucket_id='products');
