-- migration_v8.sql · Órdenes por tienda + contactos de vendedores
-- 1) purchase_requests.store_ids: qué tiendas participan en cada orden.
-- 2) RLS: el dueño de la tienda lee la orden y puede cambiar solo `status`.
-- 3) RPC tienda_contactos(): teléfonos de los dueños de tienda (para WhatsApp).

alter table public.purchase_requests
  add column if not exists store_ids text[] not null default '{}';

create index if not exists purchase_requests_store_ids_idx
  on public.purchase_requests using gin (store_ids);

-- ---------------------------------------------------------------
-- RLS · vendedor
-- ---------------------------------------------------------------
drop policy if exists purchase_requests_select_seller on public.purchase_requests;
create policy purchase_requests_select_seller
  on public.purchase_requests for select to authenticated
  using (
    exists (
      select 1 from public.stores s
      where s.owner_id = auth.uid() and s.id = any (purchase_requests.store_ids)
    )
    or exists (
      select 1
      from jsonb_array_elements(coalesce(purchase_requests.items, '[]'::jsonb)) it
      join public.stores s on s.name = (it->>'tienda')::text
      where s.owner_id = auth.uid()
    )
  );

drop policy if exists purchase_requests_update_seller on public.purchase_requests;
create policy purchase_requests_update_seller
  on public.purchase_requests for update to authenticated
  using (
    exists (
      select 1 from public.stores s
      where s.owner_id = auth.uid() and s.id = any (purchase_requests.store_ids)
    )
    or exists (
      select 1
      from jsonb_array_elements(coalesce(purchase_requests.items, '[]'::jsonb)) it
      join public.stores s on s.name = (it->>'tienda')::text
      where s.owner_id = auth.uid()
    )
  )
  with check (true);

drop policy if exists purchase_requests_update_admin on public.purchase_requests;
create policy purchase_requests_update_admin
  on public.purchase_requests for update to authenticated
  using (coalesce(public.is_admin(), false))
  with check (coalesce(public.is_admin(), false));

-- solo la columna `status` es editable por parte de los vendedores
revoke update on public.purchase_requests from authenticated;
grant update (status) on public.purchase_requests to authenticated;

-- ---------------------------------------------------------------
-- backfill de store_ids por el nombre de tienda guardado en items
-- ---------------------------------------------------------------
update public.purchase_requests pr
set store_ids = coalesce((
  select array_agg(distinct s.id)
  from jsonb_array_elements(coalesce(pr.items, '[]'::jsonb)) item
  join public.stores s on s.name = (item->>'tienda')::text
), '{}')
where pr.store_ids = '{}';

-- ---------------------------------------------------------------
-- RPC: teléfonos de contacto de los dueños de unas tiendas
-- (security definer: solo expone el teléfono de dueños de tienda)
-- ---------------------------------------------------------------
create or replace function public.tienda_contactos(nombres text[])
returns text[]
language sql
security definer
set search_path = public
as $$
  select coalesce(array_agg(distinct p.phone), '{}')
  from public.stores s
  join public.profiles p on p.id = s.owner_id
  where s.name = any (nombres)
    and p.phone is not null
    and btrim(p.phone) <> '';
$$;

revoke execute on function public.tienda_contactos(text[]) from public;
grant execute on function public.tienda_contactos(text[]) to anon, authenticated;
