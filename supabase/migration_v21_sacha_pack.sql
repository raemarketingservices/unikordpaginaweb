-- UNIKO-RD · v21 — Envíos con Sacha Pack
-- El checkout guarda la provincia (Sacha la exige). Cuando el vendedor o el admin pulsa
-- «Enviar con Sacha Pack», el servidor crea la guía en Sacha y registra aquí el envío
-- con `registrar_envio_sacha` (la columna `status` sigue siendo lo único que el
-- vendedor puede actualizar directamente, como en v8).
begin;

alter table public.purchase_requests
  add column if not exists province text,
  add column if not exists sacha_tracking text,
  add column if not exists sacha_status text,
  add column if not exists sacha_sent_at timestamptz;

-- Quién puede despachar: el admin o el dueño de alguna tienda de la orden.
create or replace function public.puede_despachar(p_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select coalesce(public.is_admin(), false) or exists (
    select 1 from public.purchase_requests pr
    join public.stores s on s.id = any (pr.store_ids)
    where pr.id = p_id and s.owner_id = auth.uid()
  );
$$;

create or replace function public.registrar_envio_sacha(p_id uuid, p_tracking text, p_province text)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.puede_despachar(p_id) then
    raise exception 'sin_permiso';
  end if;
  update public.purchase_requests
     set sacha_tracking = left(p_tracking, 120),
         sacha_status = 'pendiente',
         sacha_sent_at = now(),
         province = coalesce(nullif(trim(p_province), ''), province),
         status = case when status in ('pendiente', 'confirmada') then 'enviada' else status end
   where id = p_id;
end $$;

revoke all on function public.puede_despachar(uuid) from public;
revoke all on function public.registrar_envio_sacha(uuid, text, text) from public;
grant execute on function public.puede_despachar(uuid) to authenticated;
grant execute on function public.registrar_envio_sacha(uuid, text, text) to authenticated;

commit;
