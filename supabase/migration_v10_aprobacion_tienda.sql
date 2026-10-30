-- 10 — Aprobación de tiendas en el registro público.
--
-- El frontend ya trataba `approved === false` como tienda pendiente (publicar.tsx) y
-- el admin de la variante Cloudflare ya tenía el botón, pero la columna nunca existió
-- en Postgres: llegaba siempre undefined y el aviso de "pendiente de aprobación" no
-- salía nunca. Se añade con las 8 tiendas existentes aprobadas, porque el default es
-- el camino nuevo (registro público) y no el histórico.

alter table public.stores
  add column if not exists approved boolean not null default false;

-- Backfill: todo lo que ya estaba en la web sigue visible.
update public.stores set approved = true where approved = false;

-- Una tienda pendiente no se ve en la web ni en la app: la ve su dueño y el admin.
drop policy if exists "stores_select" on public.stores;
create policy "stores_select" on public.stores
  for select to anon, authenticated
  using (
    approved
    or owner_id = auth.uid()
    or coalesce(public.is_admin(), false)
  );

-- Sin tienda visible, sus productos tampoco: si no, el catálogo de una tienda
-- pendiente se puede leer por id y la aprobación no sirve de nada.
drop policy if exists "products_select" on public.products;
create policy "products_select" on public.products
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.stores s
      where s.id = store_id
        and (s.approved or s.owner_id = auth.uid() or coalesce(public.is_admin(), false))
    )
    or coalesce(public.is_admin(), false)
  );

drop policy if exists "services_select" on public.services;
create policy "services_select" on public.services
  for select to anon, authenticated
  using (
    store_id is null
    or exists (
      select 1 from public.stores s
      where s.id = store_id
        and (s.approved or s.owner_id = auth.uid() or coalesce(public.is_admin(), false))
    )
    or coalesce(public.is_admin(), false)
  );

-- El dueño no puede aprobarse a sí mismo: se quita `approved` de la actualización
-- propia y se deja solo para el admin (stores_update ya cubre ambos con is_admin()).
create or replace function public.guardar_tienda_pendiente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Un vendedor que se edita a sí mismo no puede autoaprobarse ni auto-suspenderse.
  if auth.uid() is not null and auth.uid() = new.owner_id and not coalesce(public.is_admin(), false) then
    new.approved := old.approved;
  end if;
  return new;
end;
$$;

drop trigger if exists stores_aprobacion_no_autodidacta on public.stores;
create trigger stores_aprobacion_no_autodidacta
  before update on public.stores
  for each row execute function public.guardar_tienda_pendiente();
