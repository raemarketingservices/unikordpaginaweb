-- ============================================================
-- UNIKO-RD · v9 — Inventario por tienda y búsqueda para el CRM
-- Aplica sobre schema.sql + migration_v2..v8.
-- ============================================================

begin;

-- 1. Inventario. `stock_enabled` es el interruptor de la tienda: hay
--    comercios que publican catálogo sin llevar existencias y no se les
--    puede obligar a un número que no mantienen.
alter table public.stores
  add column if not exists stock_enabled boolean not null default true;

alter table public.products
  add column if not exists track_inventory boolean not null default true,
  add column if not exists stock_quantity integer not null default 0 check (stock_quantity >= 0);

-- El criterio de "hay existencias" vive dentro de crm_search_products:
-- producto que no lleva inventario se considera disponible, no agotado.
create index if not exists products_store_available_idx
  on public.products (store_id, track_inventory, stock_quantity);

-- 2. Búsqueda para el bot del CRM. Devuelve SOLO lo que coincide con la
--    pregunta, no el catálogo entero: Vocero inyecta el conocimiento
--    completo en cada turno y un catálogo entero rompería el contexto.
--    Puntúa por coincidencia de término; `limit` acota el prompt.
create or replace function public.crm_search_products(
  p_store_id text,
  p_query text,
  p_limit integer default 8
) returns jsonb
language sql stable security invoker set search_path = public, pg_temp as $$
  with terms as (
    select btrim(t) as t
    from unnest(regexp_split_to_array(lower(trim(coalesce(p_query, ''))), '[[:space:]]+')) as u(t)
    where length(btrim(t)) >= 2
  ),
  scored as (
    select
      pr.id, pr.title, pr.description, pr.sku, pr.price, pr.compare_at_price,
      pr.category, pr.image, pr.store_id, pr.track_inventory, pr.stock_quantity,
      st.name as store_name, st.verified as store_verified, st.stock_enabled,
      (
        case when lower(pr.title) like '%' || lower(btrim(coalesce(p_query, ''))) || '%' then 5 else 0 end
      )::int
      + (case when exists (select 1 from terms tm where lower(pr.title) like '%' || tm.t || '%') then 3 else 0 end)::int
      + (case when exists (select 1 from terms tm where lower(coalesce(pr.description,'')) like '%' || tm.t || '%') then 1 else 0 end)::int
      + (case when p_query is not null and coalesce(pr.sku,'') <> ''
                   and lower(pr.sku) like '%' || lower(btrim(p_query)) || '%' then 2 else 0 end)::int
        as score
    from public.products pr
    join public.stores st on st.id = pr.store_id
    where pr.store_id = p_store_id
      and (p_query is null or btrim(p_query) = '' or (
            lower(pr.title)       like '%' || lower(btrim(p_query)) || '%'
         or lower(coalesce(pr.description,'')) like '%' || lower(btrim(p_query)) || '%'
         or lower(coalesce(pr.sku,''))         like '%' || lower(btrim(p_query)) || '%'
         or lower(coalesce(pr.category,''))    like '%' || lower(btrim(p_query)) || '%'
         or exists (select 1 from terms tm
                    where lower(pr.title) like '%' || tm.t || '%'
                       or lower(coalesce(pr.description,'')) like '%' || tm.t || '%'
                       or lower(coalesce(pr.sku,'')) like '%' || tm.t || '%')
      ))
  )
  select jsonb_build_object(
    'store_id', p_store_id,
    'query', p_query,
    'count', (select count(*) from scored),
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'title', s.title,
        'description', s.description,
        'sku', s.sku,
        'price', s.price,
        'compare_at_price', s.compare_at_price,
        'category', s.category,
        'image', s.image,
        'store', jsonb_build_object('id', s.store_id, 'name', s.store_name, 'verified', s.store_verified),
        'tracks_stock', s.track_inventory and s.stock_enabled,
        'stock', case when s.stock_enabled and s.track_inventory then s.stock_quantity else null end,
        'available', case
          when not s.stock_enabled then true
          when not s.track_inventory then true
          else s.stock_quantity > 0
        end
      ) order by s.score desc, s.id) from (select * from scored order by score desc, id limit greatest(1, least(coalesce(p_limit, 8), 25))) s
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.crm_search_products(text, text, integer) from public;
grant execute on function public.crm_search_products(text, text, integer) to anon, authenticated;

commit;
