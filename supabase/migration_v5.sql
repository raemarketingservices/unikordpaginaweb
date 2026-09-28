-- Migracion v5: nombre del propietario visible en el perfil publico de la tienda.
--   docker exec -i supabase-db psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -f - < migration_v5.sql

begin;

alter table public.stores
  add column if not exists owner_name text;

comment on column public.stores.owner_name is
  'Nombre visible del propietario de la tienda (denormalizado, ya que profiles no es publico).';

update public.stores s
set owner_name = nullif(
      trim(concat_ws(' ', p.first_name, p.last_name)),
      ''
    )
from public.profiles p
where s.owner_id = p.id
  and s.owner_name is null;

update public.stores s
set owner_name = nullif(trim(p.full_name), '')
from public.profiles p
where s.owner_id = p.id
  and s.owner_name is null;

commit;
