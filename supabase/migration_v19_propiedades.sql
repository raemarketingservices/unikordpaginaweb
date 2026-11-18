-- UNIKO-RD · v19 — «Tu próximo hogar está en Uniko»: renta y venta de propiedades
-- Una cuenta se registra como inmobiliaria o agente (property_agents, 1 por usuario)
-- y publica propiedades. Visible al instante (approved default true, como tiendas);
-- el admin oculta (approved = false) o borra. Web, app y APK comparten esta BD.
begin;

create table if not exists public.property_agents (
  id uuid primary key references public.profiles(id) on delete cascade,
  tipo text not null check (tipo in ('inmobiliaria', 'agente')),
  nombre text not null check (length(trim(nombre)) >= 2),
  telefono text,
  whatsapp text,
  email text,
  logo text,
  descripcion text,
  licencia text,
  provincia text,
  approved boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.properties (
  id text primary key,
  agent_id uuid not null references public.property_agents(id) on delete cascade,
  titulo text not null check (length(trim(titulo)) >= 3),
  operacion text not null check (operacion in ('venta', 'alquiler', 'alquiler_temporal')),
  tipo text not null check (tipo in ('casa', 'apartamento', 'villa', 'solar', 'local', 'oficina', 'habitacion')),
  precio numeric not null check (precio >= 0),
  moneda text not null default 'DOP' check (moneda in ('DOP', 'USD')),
  periodo text check (periodo in ('noche', 'mes')),
  habitaciones integer check (habitaciones >= 0),
  banos numeric check (banos >= 0),
  parqueos integer check (parqueos >= 0),
  metros numeric check (metros >= 0),
  provincia text,
  sector text,
  descripcion text,
  fotos text[] not null default '{}',
  amenidades text[] not null default '{}',
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  approved boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists properties_agent_idx on public.properties (agent_id);
create index if not exists properties_busqueda_idx on public.properties (operacion, tipo, provincia);

alter table public.property_agents enable row level security;
alter table public.properties enable row level security;

drop policy if exists "agents_select" on public.property_agents;
create policy "agents_select" on public.property_agents for select to anon, authenticated
  using (approved or id = auth.uid() or coalesce(public.is_admin(), false));
drop policy if exists "agents_insert" on public.property_agents;
create policy "agents_insert" on public.property_agents for insert to authenticated
  with check (id = auth.uid() or coalesce(public.is_admin(), false));
drop policy if exists "agents_update" on public.property_agents;
create policy "agents_update" on public.property_agents for update to authenticated
  using (id = auth.uid() or coalesce(public.is_admin(), false))
  with check (id = auth.uid() or coalesce(public.is_admin(), false));
drop policy if exists "agents_delete" on public.property_agents;
create policy "agents_delete" on public.property_agents for delete to authenticated
  using (id = auth.uid() or coalesce(public.is_admin(), false));

drop policy if exists "properties_select" on public.properties;
create policy "properties_select" on public.properties for select to anon, authenticated
  using (
    (approved and exists (select 1 from public.property_agents a where a.id = agent_id and a.approved))
    or agent_id = auth.uid() or coalesce(public.is_admin(), false)
  );
drop policy if exists "properties_insert" on public.properties;
create policy "properties_insert" on public.properties for insert to authenticated
  with check (agent_id = auth.uid() or coalesce(public.is_admin(), false));
drop policy if exists "properties_update" on public.properties;
create policy "properties_update" on public.properties for update to authenticated
  using (agent_id = auth.uid() or coalesce(public.is_admin(), false))
  with check (agent_id = auth.uid() or coalesce(public.is_admin(), false));
drop policy if exists "properties_delete" on public.properties;
create policy "properties_delete" on public.properties for delete to authenticated
  using (agent_id = auth.uid() or coalesce(public.is_admin(), false));

-- El agente no puede publicarse/des-ocultarse solo: `approved` lo decide el admin.
create or replace function public.guardar_aprobacion_inmueble()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if not coalesce(public.is_admin(), false) then
    new.approved := case when tg_op = 'INSERT' then true else old.approved end;
  end if;
  return new;
end $$;
drop trigger if exists agents_aprobacion on public.property_agents;
create trigger agents_aprobacion before insert or update on public.property_agents
  for each row execute function public.guardar_aprobacion_inmueble();
drop trigger if exists properties_aprobacion on public.properties;
create trigger properties_aprobacion before insert or update on public.properties
  for each row execute function public.guardar_aprobacion_inmueble();

grant select on public.property_agents, public.properties to anon, authenticated;
grant insert, update, delete on public.property_agents, public.properties to authenticated;

do $$
declare t text;
begin
  foreach t in array array['properties', 'property_agents'] loop
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

commit;
