-- 14 — ¿Este correo es el dueño de esta tienda?
--
-- El CRM (RAE Suite) deja que el dueño de un espacio vincule su bot de WhatsApp
-- con su tienda de UNIKO-RD pegando el Store ID. Para que nadie vincule la
-- tienda de otro, el CRM pregunta aquí si el correo de su cuenta es el de la
-- cuenta UNIKO dueña de la tienda (`stores.owner_id` → `auth.users`).
--
-- Solo devuelve sí/no: nunca entrega el correo del dueño. Security definer
-- porque ni `profiles` ni `auth.users` son legibles por anon.

begin;

create or replace function public.crm_store_owner_matches(
  p_store_id text,
  p_email text
) returns boolean
language sql stable security definer set search_path = public, auth, pg_temp as $$
  select exists (
    select 1
    from public.stores s
    join auth.users u on u.id = s.owner_id
    where s.id = p_store_id
      and u.email is not null
      and lower(u.email) = lower(btrim(coalesce(p_email, '')))
  );
$$;

revoke all on function public.crm_store_owner_matches(text, text) from public;
grant execute on function public.crm_store_owner_matches(text, text) to anon, authenticated;

commit;
