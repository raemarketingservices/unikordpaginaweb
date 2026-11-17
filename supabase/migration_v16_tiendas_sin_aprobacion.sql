-- UNIKO-RD · v16 — Las tiendas salen al público desde que se crean
-- Antes (v10/v11) toda tienda nueva de un vendedor quedaba `approved = false` hasta que
-- un admin la aprobara, y la web/app solo listan aprobadas. El dueño del marketplace
-- quiere que salgan en vivo. El admin sigue pudiendo suspender (approved = false) o
-- borrar; el vendedor sigue sin poder cambiar su propio `approved`.
begin;

alter table public.stores alter column approved set default true;

create or replace function public.guardar_tienda_pendiente()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is not null and auth.uid() = new.owner_id and not coalesce(public.is_admin(), false) then
    new.approved := case when tg_op = 'INSERT' then true else old.approved end;
  end if;
  return new;
end;
$$;

-- Las que quedaron pendientes con la regla vieja.
update public.stores set approved = true where approved = false;

commit;
