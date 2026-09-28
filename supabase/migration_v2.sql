-- ============================================================
-- UNIKO-RD · Migración v2 (perfiles completos, tiendas con RNC,
-- productos con SKU/galería/videos, ratings de tiendas, chatbot)
-- Ejecutar:
--   docker exec -i supabase-db psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -f - < migration_v2.sql
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. profiles: campos de perfil completo
-- ------------------------------------------------------------
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists cedula text;

-- ------------------------------------------------------------
-- 2. handle_new_user: copia metadata del registro
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, full_name, first_name, last_name, phone, cedula, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'cedula',
    case when new.raw_user_meta_data ->> 'account_type' = 'vendor' then 'vendor' else 'user' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ------------------------------------------------------------
-- 3. stores: RNC y descripción
-- ------------------------------------------------------------
alter table public.stores add column if not exists rnc text;
alter table public.stores add column if not exists description text;

-- ------------------------------------------------------------
-- 4. products: descripción, SKU, galería de fotos y videos
-- ------------------------------------------------------------
alter table public.products add column if not exists description text;
alter table public.products add column if not exists sku text;
alter table public.products add column if not exists gallery jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists videos jsonb not null default '[]'::jsonb;
create index if not exists products_sku_idx on public.products (sku);

-- ------------------------------------------------------------
-- 5. store_ratings (reseñas de 1 a 5 estrellas por usuario)
-- ------------------------------------------------------------
create table if not exists public.store_ratings (
  store_id text not null references public.stores (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (store_id, user_id)
);

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

drop trigger if exists store_ratings_refresh on public.store_ratings;
create trigger store_ratings_refresh
  after insert or update or delete on public.store_ratings
  for each row execute function public.refresh_store_rating();

-- ------------------------------------------------------------
-- 6. chatbot_settings (config del chatbot para el panel admin)
-- ------------------------------------------------------------
create table if not exists public.chatbot_settings (
  id text primary key,
  enabled boolean not null default true,
  greeting text not null default '',
  allowed_stores jsonb not null default '["*"]'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.chatbot_settings (id, greeting)
values ('default', '¡Hola! Soy UNIKO, el asistente de UNIKO-RD. Pregúntame por productos, precios, ofertas o tiendas.')
on conflict (id) do nothing;

drop trigger if exists touch_chatbot_settings on public.chatbot_settings;
create trigger touch_chatbot_settings
  before update on public.chatbot_settings
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------
-- 7. Grants (tablas nuevas)
-- ------------------------------------------------------------
grant select on public.store_ratings to anon, authenticated;
grant insert, update, delete on public.store_ratings to authenticated;
grant select on public.chatbot_settings to anon, authenticated;
grant insert, update, delete on public.chatbot_settings to authenticated;

-- ------------------------------------------------------------
-- 8. Row Level Security
-- ------------------------------------------------------------
alter table public.store_ratings enable row level security;
alter table public.chatbot_settings enable row level security;

drop policy if exists "store_ratings_select" on public.store_ratings;
create policy "store_ratings_select" on public.store_ratings
  for select to anon, authenticated using (true);

drop policy if exists "store_ratings_insert" on public.store_ratings;
create policy "store_ratings_insert" on public.store_ratings
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "store_ratings_update" on public.store_ratings;
create policy "store_ratings_update" on public.store_ratings
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "store_ratings_delete" on public.store_ratings;
create policy "store_ratings_delete" on public.store_ratings
  for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "chatbot_settings_select" on public.chatbot_settings;
create policy "chatbot_settings_select" on public.chatbot_settings
  for select to anon, authenticated using (true);

drop policy if exists "chatbot_settings_admin_insert" on public.chatbot_settings;
create policy "chatbot_settings_admin_insert" on public.chatbot_settings
  for insert to authenticated
  with check (coalesce(public.is_admin(), false));

drop policy if exists "chatbot_settings_admin_update" on public.chatbot_settings;
create policy "chatbot_settings_admin_update" on public.chatbot_settings
  for update to authenticated
  using (coalesce(public.is_admin(), false))
  with check (coalesce(public.is_admin(), false));

commit;

notify pgrst, 'reload schema';
