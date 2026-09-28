-- Incremental migration. Preserves existing accounts, stores and products.
begin;

create sequence if not exists public.marketplace_sku_seq;
create or replace function public.assign_product_sku() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    new.sku := 'UNIKO-' || lpad(nextval('public.marketplace_sku_seq')::text, 10, '0');
  elsif new.sku is distinct from old.sku then
    raise exception 'El SKU no se puede modificar';
  end if;
  return new;
end $$;
update public.products set sku = 'UNIKO-' || lpad(nextval('public.marketplace_sku_seq')::text, 10, '0')
where sku is null or trim(sku) = '';
create unique index if not exists products_sku_unique on public.products(sku);
drop trigger if exists assign_product_sku on public.products;
create trigger assign_product_sku before insert or update on public.products
for each row execute function public.assign_product_sku();
alter table public.products alter column price type numeric(12,2);
alter table public.products alter column compare_at_price type numeric(12,2);

create or replace function public.refresh_store_products_count() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op <> 'INSERT' then
    update public.stores set products_count = (select count(*) from public.products where store_id = old.store_id) where id = old.store_id;
  end if;
  if tg_op <> 'DELETE' then
    update public.stores set products_count = (select count(*) from public.products where store_id = new.store_id) where id = new.store_id;
  end if;
  return coalesce(new, old);
end $$;

-- Owners cannot grant themselves verification or rewrite aggregate ratings.
create or replace function public.protect_marketplace_fields() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null or public.is_admin() or pg_trigger_depth() > 1 then return new; end if;
  if tg_op = 'INSERT' then
    new.verified := false; new.featured := false; new.rating := 0; new.reviews := 0;
    if tg_table_name = 'stores' then new.products_count := 0; new.followers := 0;
    else new.best_seller := false; end if;
  else
    new.verified := old.verified; new.featured := old.featured;
    new.rating := old.rating; new.reviews := old.reviews;
    if tg_table_name = 'stores' then
      new.products_count := old.products_count; new.followers := old.followers;
    else new.best_seller := old.best_seller; end if;
  end if;
  return new;
end $$;
drop trigger if exists protect_store_fields on public.stores;
create trigger protect_store_fields before insert or update on public.stores for each row execute function public.protect_marketplace_fields();
drop trigger if exists protect_product_fields on public.products;
create trigger protect_product_fields before insert or update on public.products for each row execute function public.protect_marketplace_fields();

drop trigger if exists touch_store_ratings on public.store_ratings;
create trigger touch_store_ratings before update on public.store_ratings for each row execute function public.touch_updated_at();

-- The widget only receives the catalog authorized in the admin settings.
create or replace function public.marketplace_chatbot_catalog() returns jsonb
language sql stable security invoker set search_path = public, pg_temp as $$
  with cfg as (select * from public.chatbot_settings where id = 'default'),
  allowed as (
    select s.* from public.stores s, cfg c
    where c.enabled and (c.allowed_stores ? '*' or c.allowed_stores ? s.id)
  )
  select jsonb_build_object(
    'cfg', coalesce((select to_jsonb(c) from cfg c), '{"id":"default","enabled":false,"greeting":"","allowed_stores":[],"updated_at":""}'::jsonb),
    'stores', coalesce((select jsonb_agg(to_jsonb(s)) from allowed s), '[]'::jsonb),
    'products', coalesce((select jsonb_agg(to_jsonb(p) || jsonb_build_object('stores',jsonb_build_object('name',s.name,'verified',s.verified)) order by p.created_at desc) from public.products p join allowed s on s.id=p.store_id), '[]'::jsonb),
    'services', coalesce((select jsonb_agg(to_jsonb(v)) from public.services v join allowed s on s.id=v.store_id), '[]'::jsonb),
    'categories', coalesce((select jsonb_agg(to_jsonb(c)) from public.categories c), '[]'::jsonb)
  );
$$;
revoke all on function public.marketplace_chatbot_catalog() from public;
grant execute on function public.marketplace_chatbot_catalog() to anon, authenticated;

update storage.buckets set file_size_limit = 52428800,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']
where id = 'marketplace';

update public.stores s set products_count = (select count(*) from public.products p where p.store_id=s.id);
commit;
notify pgrst, 'reload schema';
