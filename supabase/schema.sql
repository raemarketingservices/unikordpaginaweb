-- ============================================================
-- UNIKO-RD · Schema limpio (reemplaza tablas previas de public)
-- Ejecutar como superusuario de la BD:
--   docker exec -i supabase-db psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -f - < schema.sql
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Limpieza de objetos previos en el esquema public
-- ------------------------------------------------------------
do $$
declare
  obj record;
begin
  for obj in
    select c.relname, c.relkind
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'S')
  loop
    if obj.relkind = 'S' then
      execute format('drop sequence if exists public.%I cascade', obj.relname);
    elsif obj.relkind in ('v', 'm') then
      execute format('drop view if exists public.%I cascade', obj.relname);
    else
      execute format('drop table if exists public.%I cascade', obj.relname);
    end if;
  end loop;

  for obj in
    select p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  loop
    execute format('drop function if exists public.%I(%s) cascade', obj.proname, obj.args);
  end loop;
end $$;

-- ------------------------------------------------------------
-- 2. Funciones auxiliares (las que dependen de tablas van después)
-- ------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (
    id, email, full_name, first_name, last_name, phone, cedula, role,
    terms_accepted_at, privacy_accepted_at, marketing_accepted_at, consent_version
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'cedula',
    case when new.raw_user_meta_data ->> 'account_type' = 'vendor' then 'vendor' else 'user' end,
    nullif(new.raw_user_meta_data ->> 'terms_accepted_at', '')::timestamptz,
    nullif(new.raw_user_meta_data ->> 'privacy_accepted_at', '')::timestamptz,
    nullif(new.raw_user_meta_data ->> 'marketing_accepted_at', '')::timestamptz,
    nullif(new.raw_user_meta_data ->> 'consent_version', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.refresh_store_rating()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_store text;
begin
  target_store := coalesce(new.store_id, old.store_id);
  update public.stores
  set rating = coalesce(
        (select round(avg(rating)::numeric, 1) from public.store_ratings where store_id = target_store),
        0
      ),
      reviews = (select count(*) from public.store_ratings where store_id = target_store)
  where id = target_store;
  return coalesce(new, old);
end;
$$;

create or replace function public.refresh_store_products_count()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_store text;
begin
  target_store := coalesce(new.store_id, old.store_id);
  update public.stores
  set products_count = (select count(*) from public.products where store_id = target_store)
  where id = target_store;
  return coalesce(new, old);
end;
$$;

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Bloquea auto-escalada de rol cuando la escritura viene de un cliente autenticado.
  -- auth.uid() nulo => escritura directa (SQL/seed/service_role), se permite.
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not coalesce(public.is_admin(), false) then
    raise exception 'No tienes permiso para cambiar roles';
  end if;
  return new;
end;
$$;

-- ------------------------------------------------------------
-- 3. Tablas
-- ------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  first_name text,
  last_name text,
  cedula text,
  phone text,
  role text not null default 'user' check (role in ('user', 'vendor', 'admin')),
  avatar_url text,
  terms_accepted_at timestamptz,
  privacy_accepted_at timestamptz,
  marketing_accepted_at timestamptz,
  consent_version text,
  created_at timestamptz not null default now()
);

create table public.categories (
  id text primary key,
  name text not null,
  icon text,
  tipo text not null default 'ambos' check (tipo in ('producto', 'servicio', 'ambos')),
  position int not null default 0
);

create table public.stores (
  id text primary key,
  owner_id uuid references public.profiles (id) on delete set null,
  owner_name text,
  name text not null,
  rnc text,
  description text,
  category text,
  location text,
  verified boolean not null default false,
  featured boolean not null default false,
  rating numeric not null default 0,
  reviews int not null default 0,
  followers int not null default 0,
  products_count int not null default 0,
  logo text,
  cover text,
  created_at timestamptz not null default now()
);

create table public.products (
  id text primary key,
  store_id text not null references public.stores (id) on delete cascade,
  title text not null,
  description text,
  sku text,
  category text references public.categories (id),
  price int not null check (price >= 0),
  compare_at_price int check (compare_at_price > 0),
  verified boolean not null default false,
  rating numeric not null default 0,
  reviews int not null default 0,
  location text,
  shipping boolean not null default true,
  image text,
  gallery jsonb not null default '[]'::jsonb,
  videos jsonb not null default '[]'::jsonb,
  featured boolean not null default false,
  best_seller boolean not null default false,
  is_new boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.services (
  id text primary key,
  owner_id uuid references public.profiles (id) on delete set null,
  store_id text references public.stores (id) on delete set null,
  title text not null,
  category text references public.categories (id),
  price_from int not null check (price_from >= 0),
  provider text,
  verified boolean not null default false,
  rating numeric not null default 0,
  reviews int not null default 0,
  location text,
  coverage text,
  image text,
  recommended boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.page_blocks (
  id uuid primary key default gen_random_uuid(),
  page text not null default 'home',
  type text not null,
  title text,
  subtitle text,
  position int not null default 0,
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.store_ratings (
  store_id text not null references public.stores (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (store_id, user_id)
);

create table public.chatbot_settings (
  id text primary key,
  enabled boolean not null default true,
  greeting text not null default '',
  allowed_stores jsonb not null default '["*"]'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.chatbot_settings (id, greeting)
values ('default', '¡Hola! Soy UNIKO, el asistente de UNIKO-RD. Pregúntame por productos, precios, ofertas o tiendas.')
on conflict (id) do nothing;

-- purchase_requests: solicitudes de compra del checkout (web y app Android).
-- El comprador envía sus datos de contacto; el admin coordina entrega/pago.
create table if not exists public.purchase_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  full_name text not null,
  address text not null,
  phone text not null,
  email text not null,
  cedula text,
  note text,
  items jsonb not null default '[]'::jsonb,
  total numeric,
  source text not null default 'web',
  status text not null default 'pendiente',
  created_at timestamptz not null default now()
);

create index page_blocks_page_position_idx on public.page_blocks (page, position);
create index products_store_idx on public.products (store_id);
create index products_category_idx on public.products (category);
create index products_sku_idx on public.products (sku);
create index services_category_idx on public.services (category);
create index stores_owner_idx on public.stores (owner_id);
create index purchase_requests_created_idx on public.purchase_requests (created_at desc);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ------------------------------------------------------------
-- 4. Triggers
-- ------------------------------------------------------------
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger protect_profile_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

create trigger touch_page_blocks
  before update on public.page_blocks
  for each row execute function public.touch_updated_at();

create trigger store_ratings_refresh
  after insert or update or delete on public.store_ratings
  for each row execute function public.refresh_store_rating();

create trigger products_count_refresh
  after insert or update or delete on public.products
  for each row execute function public.refresh_store_products_count();

create trigger touch_chatbot_settings
  before update on public.chatbot_settings
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------
-- 5. Grants (RLS hace la autorización real)
-- ------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
-- invitados (checkout sin sesión) pueden crear solicitudes de compra
grant insert on public.purchase_requests to anon;
grant usage, select on all sequences in schema public to anon, authenticated;

-- ------------------------------------------------------------
-- 6. Row Level Security
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.services enable row level security;
alter table public.page_blocks enable row level security;
alter table public.store_ratings enable row level security;
alter table public.chatbot_settings enable row level security;

-- profiles: lectura propia (o admin), edición propia (o admin);
-- el INSERT solo lo hace handle_new_user() (security definer).
create policy "profiles_select" on public.profiles
  for select to anon, authenticated
  using (id = auth.uid() or coalesce(public.is_admin(), false));

create policy "profiles_update" on public.profiles
  for update to authenticated
  using (id = auth.uid() or coalesce(public.is_admin(), false))
  with check (id = auth.uid() or coalesce(public.is_admin(), false));

-- categories: lectura pública, escritura solo admin.
create policy "categories_select" on public.categories
  for select to anon, authenticated using (true);

create policy "categories_admin" on public.categories
  for all to authenticated
  using (coalesce(public.is_admin(), false))
  with check (coalesce(public.is_admin(), false));

-- stores: lectura pública; dueño crea/edita su tienda; admin todo.
create policy "stores_select" on public.stores
  for select to anon, authenticated using (true);

create policy "stores_insert" on public.stores
  for insert to authenticated
  with check (owner_id = auth.uid());

create policy "stores_update" on public.stores
  for update to authenticated
  using (owner_id = auth.uid() or coalesce(public.is_admin(), false))
  with check (owner_id = auth.uid() or coalesce(public.is_admin(), false));

create policy "stores_delete" on public.stores
  for delete to authenticated
  using (owner_id = auth.uid() or coalesce(public.is_admin(), false));

-- products: lectura pública; escritura si el dueño posee la tienda (o admin).
create policy "products_select" on public.products
  for select to anon, authenticated using (true);

create policy "products_insert" on public.products
  for insert to authenticated
  with check (
    exists (
      select 1 from public.stores s
      where s.id = store_id and s.owner_id = auth.uid()
    ) or coalesce(public.is_admin(), false)
  );

create policy "products_update" on public.products
  for update to authenticated
  using (
    exists (
      select 1 from public.stores s
      where s.id = store_id and s.owner_id = auth.uid()
    ) or coalesce(public.is_admin(), false)
  )
  with check (
    exists (
      select 1 from public.stores s
      where s.id = store_id and s.owner_id = auth.uid()
    ) or coalesce(public.is_admin(), false)
  );

create policy "products_delete" on public.products
  for delete to authenticated
  using (
    exists (
      select 1 from public.stores s
      where s.id = store_id and s.owner_id = auth.uid()
    ) or coalesce(public.is_admin(), false)
  );

-- services: lectura pública; dueño o admin escriben.
create policy "services_select" on public.services
  for select to anon, authenticated using (true);

create policy "services_insert" on public.services
  for insert to authenticated
  with check (owner_id = auth.uid() or coalesce(public.is_admin(), false));

create policy "services_update" on public.services
  for update to authenticated
  using (owner_id = auth.uid() or coalesce(public.is_admin(), false))
  with check (owner_id = auth.uid() or coalesce(public.is_admin(), false));

create policy "services_delete" on public.services
  for delete to authenticated
  using (owner_id = auth.uid() or coalesce(public.is_admin(), false));

-- page_blocks: lectura pública (home), edición solo admin.
create policy "page_blocks_select" on public.page_blocks
  for select to anon, authenticated using (true);

create policy "page_blocks_admin_insert" on public.page_blocks
  for insert to authenticated
  with check (coalesce(public.is_admin(), false));

create policy "page_blocks_admin_update" on public.page_blocks
  for update to authenticated
  using (coalesce(public.is_admin(), false))
  with check (coalesce(public.is_admin(), false));

create policy "page_blocks_admin_delete" on public.page_blocks
  for delete to authenticated
  using (coalesce(public.is_admin(), false));

-- store_ratings: lectura pública; cada usuario escribe solo su propia reseña.
create policy "store_ratings_select" on public.store_ratings
  for select to anon, authenticated using (true);

create policy "store_ratings_insert" on public.store_ratings
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "store_ratings_update" on public.store_ratings
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "store_ratings_delete" on public.store_ratings
  for delete to authenticated
  using (user_id = auth.uid());

-- chatbot_settings: lectura pública (el widget lee la config); escritura solo admin.
create policy "chatbot_settings_select" on public.chatbot_settings
  for select to anon, authenticated using (true);

create policy "chatbot_settings_admin_insert" on public.chatbot_settings
  for insert to authenticated
  with check (coalesce(public.is_admin(), false));

create policy "chatbot_settings_admin_update" on public.chatbot_settings
  for update to authenticated
  using (coalesce(public.is_admin(), false))
  with check (coalesce(public.is_admin(), false));

-- purchase_requests: cualquiera (incluido invitado) puede enviar una solicitud;
-- solo el admin puede leerlas. Ojo: leer la fila de vuelta (returning/select)
-- exige la política SELECT, por eso el checkout no hace .select().
alter table public.purchase_requests enable row level security;

create policy "purchase_requests_insert" on public.purchase_requests
  for insert to anon, authenticated with check (true);

create policy "purchase_requests_select_admin" on public.purchase_requests
  for select to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ));

-- ------------------------------------------------------------
-- 7. Bucket de almacenamiento (imágenes)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('marketplace', 'marketplace', true)
on conflict (id) do nothing;

create policy "marketplace_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'marketplace');

create policy "marketplace_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'marketplace' and owner = auth.uid());

create policy "marketplace_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'marketplace' and owner = auth.uid())
  with check (bucket_id = 'marketplace' and owner = auth.uid());

create policy "marketplace_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'marketplace' and owner = auth.uid());

commit;

notify pgrst, 'reload schema';
