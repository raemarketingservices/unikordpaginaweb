-- migration_v7.sql · Solicitudes de compra (formulario de datos de compra)
-- Ventas manuales: el comprador envía sus datos de contacto y el
-- administrador coordina la entrega/pago por fuera de la plataforma.

create table if not exists public.purchase_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  full_name text not null,
  address text not null,
  phone text not null,
  email text not null,
  cedula text,
  note text,
  items jsonb not null default '[]'::jsonb,
  total numeric,
  source text not null default 'web',
  status text not null default 'pendiente',
  created_at timestamptz not null default now()
);

comment on table public.purchase_requests is
  'Solicitudes de compra enviadas desde el checkout de la web o de la app Android.';

alter table public.purchase_requests enable row level security;

-- el checkout funciona sin sesión (invitado), por eso anon necesita INSERT
grant insert on public.purchase_requests to anon;

drop policy if exists purchase_requests_insert on public.purchase_requests;
create policy purchase_requests_insert
  on public.purchase_requests
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists purchase_requests_select_admin on public.purchase_requests;
create policy purchase_requests_select_admin
  on public.purchase_requests
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
