-- v11: la cola de aprobación se podía saltar al crear la tienda.
--
-- v10 colgó `guardar_tienda_pendiente()` de `before update`, pero la función leía
-- `old.approved`, que en un INSERT no existe. Probado en producción el 2026-10-28 con
-- una cuenta de vendedor desechable: un `POST /rest/v1/stores` con `"approved":true`
-- se aceptaba (201) y la tienda aparecía de inmediato para un visitante anónimo.
-- El parche de v10 cierra el PATCH, que es el que usa la app; este cierra el alta.

create or replace function public.guardar_tienda_pendiente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- El dueño no decide su propia aprobación: al nacer entra a la cola pendiente y al
  -- editarse conserva el valor anterior. Con `auth.uid()` vacío (service_role, psql
  -- del homelab, seeds) no se aplica: esas rutas no son un vendedor autoaprobándose.
  if auth.uid() is not null and auth.uid() = new.owner_id and not coalesce(public.is_admin(), false) then
    new.approved := case when tg_op = 'INSERT' then false else old.approved end;
  end if;
  return new;
end;
$$;

drop trigger if exists stores_aprobacion_no_autodidacta on public.stores;
create trigger stores_aprobacion_no_autodidacta
  before insert or update on public.stores
  for each row execute function public.guardar_tienda_pendiente();
