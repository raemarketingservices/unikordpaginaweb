-- Migracion v6: consentimientos de registro (Ley 158-13 de Proteccion de Datos Personales).
--   docker exec -i supabase-db psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -f - < migration_v6.sql

begin;

alter table public.profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists privacy_accepted_at timestamptz,
  add column if not exists marketing_accepted_at timestamptz,
  add column if not exists consent_version text;

comment on column public.profiles.terms_accepted_at is
  'Fecha de aceptacion expresa de Terminos y Condiciones (checkbox de registro).';
comment on column public.profiles.privacy_accepted_at is
  'Fecha de aceptacion de la Politica de Privacidad y Proteccion de Datos Personales.';
comment on column public.profiles.marketing_accepted_at is
  'Fecha del consentimiento opcional para correos promocionales (null = no acepta).';
comment on column public.profiles.consent_version is
  'Version del bloque legal aceptado (ej: 2026-09).';

-- Copia los consentimientos del metadata del signup a profiles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (
    id, email, full_name, first_name, last_name, phone, cedula, role,
    terms_accepted_at, privacy_accepted_at, marketing_accepted_at, consent_version
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'cedula',
    case when new.raw_user_meta_data ->> 'account_type' = 'vendor' then 'vendor' else 'user' end,
    nullif(new.raw_user_meta_data ->> 'terms_accepted_at', '')::timestamptz,
    nullif(new.raw_user_meta_data ->> 'privacy_accepted_at', '')::timestamptz,
    nullif(new.raw_user_meta_data ->> 'marketing_accepted_at', '')::timestamptz,
    nullif(new.raw_user_meta_data ->> 'consent_version', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

commit;
