-- UNIKO-RD · Migración v3: products_count se recalcula automáticamente
-- docker exec -i supabase-db psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -f - < migration_v3.sql

begin;

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

drop trigger if exists products_count_refresh on public.products;
create trigger products_count_refresh
  after insert or update or delete on public.products
  for each row execute function public.refresh_store_products_count();

commit;
