-- UNIKO-RD · v20 — «Tu movilidad empieza en Uniko»: renta de vehículos
-- Una cuenta se registra como Rent-A-Car o particular (vehicle_providers, 1 por usuario)
-- y publica vehículos con tarifa por día. Mismo patrón que v19 (propiedades):
-- visible al instante, el admin oculta/borra, el dueño no se auto-aprueba.
begin;

create table if not exists public.vehicle_providers (
  id uuid primary key references public.profiles(id) on delete cascade,
  tipo text not null check (tipo in ('rentacar', 'particular')),
  nombre text not null check (length(trim(nombre)) >= 2),
  telefono text,
  whatsapp text,
  email text,
  logo text,
  descripcion text,
  provincia text,
  approved boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id text primary key,
  provider_id uuid not null references public.vehicle_providers(id) on delete cascade,
  marca text not null check (length(trim(marca)) >= 2),
  modelo text not null check (length(trim(modelo)) >= 1),
  anio integer not null check (anio between 1950 and 2100),
  color text,
  tipo text not null check (tipo in ('sedan', 'jeepeta', 'camioneta', 'minivan', 'deportivo', 'compacto', 'motor')),
  transmision text not null default 'automatica' check (transmision in ('automatica', 'manual')),
  combustible text not null default 'gasolina' check (combustible in ('gasolina', 'diesel', 'hibrido', 'electrico', 'glp')),
  pasajeros integer not null check (pasajeros between 1 and 60),
  puertas integer check (puertas between 0 and 10),
  kilometraje integer check (kilometraje >= 0),
  tarifa_dia numeric not null check (tarifa_dia >= 0),
  moneda text not null default 'DOP' check (moneda in ('DOP', 'USD')),
  deposito numeric check (deposito >= 0),
  provincia text,
  descripcion text,
  fotos text[] not null default '{}',
  extras text[] not null default '{}',
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  approved boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists vehicles_provider_idx on public.vehicles (provider_id);
create index if not exists vehicles_busqueda_idx on public.vehicles (tipo, provincia);

alter table public.vehicle_providers enable row level security;
alter table public.vehicles enable row level security;

drop policy if exists "vproviders_select" on public.vehicle_providers;
create policy "vproviders_select" on public.vehicle_providers for select to anon, authenticated
  using (approved or id = auth.uid() or coalesce(public.is_admin(), false));
drop policy if exists "vproviders_insert" on public.vehicle_providers;
create policy "vproviders_insert" on public.vehicle_providers for insert to authenticated
  with check (id = auth.uid() or coalesce(public.is_admin(), false));
drop policy if exists "vproviders_update" on public.vehicle_providers;
create policy "vproviders_update" on public.vehicle_providers for update to authenticated
  using (id = auth.uid() or coalesce(public.is_admin(), false))
  with check (id = auth.uid() or coalesce(public.is_admin(), false));
drop policy if exists "vproviders_delete" on public.vehicle_providers;
create policy "vproviders_delete" on public.vehicle_providers for delete to authenticated
  using (id = auth.uid() or coalesce(public.is_admin(), false));

drop policy if exists "vehicles_select" on public.vehicles;
create policy "vehicles_select" on public.vehicles for select to anon, authenticated
  using (
    (approved and exists (select 1 from public.vehicle_providers p where p.id = provider_id and p.approved))
    or provider_id = auth.uid() or coalesce(public.is_admin(), false)
  );
drop policy if exists "vehicles_insert" on public.vehicles;
create policy "vehicles_insert" on public.vehicles for insert to authenticated
  with check (provider_id = auth.uid() or coalesce(public.is_admin(), false));
drop policy if exists "vehicles_update" on public.vehicles;
create policy "vehicles_update" on public.vehicles for update to authenticated
  using (provider_id = auth.uid() or coalesce(public.is_admin(), false))
  with check (provider_id = auth.uid() or coalesce(public.is_admin(), false));
drop policy if exists "vehicles_delete" on public.vehicles;
create policy "vehicles_delete" on public.vehicles for delete to authenticated
  using (provider_id = auth.uid() or coalesce(public.is_admin(), false));

-- Reutiliza la guarda de v19: solo el admin decide `approved`.
drop trigger if exists vproviders_aprobacion on public.vehicle_providers;
create trigger vproviders_aprobacion before insert or update on public.vehicle_providers
  for each row execute function public.guardar_aprobacion_inmueble();
drop trigger if exists vehicles_aprobacion on public.vehicles;
create trigger vehicles_aprobacion before insert or update on public.vehicles
  for each row execute function public.guardar_aprobacion_inmueble();

grant select on public.vehicle_providers, public.vehicles to anon, authenticated;
grant insert, update, delete on public.vehicle_providers, public.vehicles to authenticated;

do $$
declare t text;
begin
  foreach t in array array['vehicles', 'vehicle_providers'] loop
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

commit;
