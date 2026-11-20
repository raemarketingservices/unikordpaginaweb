-- UNIKO-RD · v23 — «Uniko Afiliados»
-- Tablas: affiliates (perfil + vitrina), affiliate_products (lo que promociona),
-- affiliate_clicks (visitas por enlace) y affiliate_commissions (ventas atribuidas).
-- Atribución: el enlace /productos/<id>?ref=<slug> guarda el ref en el navegador; el
-- checkout lo copia en cada ítem del pedido (items[].ref) y un trigger crea la comisión
-- con el precio REAL del producto (no el que mande el cliente). La comisión nace
-- «pendiente», pasa a «aprobada» cuando la orden se completa y a «anulada» si se cancela;
-- el admin la marca «pagada».
begin;

create table if not exists public.affiliates (
  id uuid primary key references public.profiles(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  nombre text not null check (length(trim(nombre)) >= 2),
  apellido text not null check (length(trim(apellido)) >= 2),
  telefono text,
  metodo_pago text,
  status text not null default 'activo' check (status in ('activo', 'pausado')),
  commission_rate numeric not null default 10 check (commission_rate between 0 and 90),
  terms_accepted_at timestamptz not null,
  terms_version text not null default '2026-11',
  -- Vitrina: { titulo, bio, color, boton_color, boton_texto, boton_forma, disposicion }
  theme jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.affiliate_products (
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (affiliate_id, product_id)
);

create table if not exists public.affiliate_clicks (
  id bigint generated always as identity primary key,
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  product_id text references public.products(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists affiliate_clicks_idx on public.affiliate_clicks (affiliate_id, created_at desc);

create table if not exists public.affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  purchase_request_id uuid not null references public.purchase_requests(id) on delete cascade,
  product_id text references public.products(id) on delete set null,
  producto text,
  cantidad integer not null default 1,
  monto_venta numeric not null,
  tasa numeric not null,
  comision numeric not null,
  status text not null default 'pendiente' check (status in ('pendiente', 'aprobada', 'pagada', 'anulada')),
  created_at timestamptz not null default now(),
  unique (purchase_request_id, product_id)
);
create index if not exists affiliate_commissions_idx on public.affiliate_commissions (affiliate_id, created_at desc);

alter table public.affiliates enable row level security;
alter table public.affiliate_products enable row level security;
alter table public.affiliate_clicks enable row level security;
alter table public.affiliate_commissions enable row level security;

-- Afiliado: ve y edita lo suyo; admin todo. Lo público sale por las RPC de abajo.
drop policy if exists "aff_select" on public.affiliates;
create policy "aff_select" on public.affiliates for select to authenticated
  using (id = auth.uid() or coalesce(public.is_admin(), false));
drop policy if exists "aff_insert" on public.affiliates;
create policy "aff_insert" on public.affiliates for insert to authenticated
  with check (id = auth.uid());
drop policy if exists "aff_update" on public.affiliates;
create policy "aff_update" on public.affiliates for update to authenticated
  using (id = auth.uid() or coalesce(public.is_admin(), false))
  with check (id = auth.uid() or coalesce(public.is_admin(), false));
drop policy if exists "aff_delete" on public.affiliates;
create policy "aff_delete" on public.affiliates for delete to authenticated
  using (coalesce(public.is_admin(), false));

drop policy if exists "affp_select" on public.affiliate_products;
create policy "affp_select" on public.affiliate_products for select to authenticated
  using (affiliate_id = auth.uid() or coalesce(public.is_admin(), false));
drop policy if exists "affp_write" on public.affiliate_products;
create policy "affp_write" on public.affiliate_products for all to authenticated
  using (affiliate_id = auth.uid() or coalesce(public.is_admin(), false))
  with check (affiliate_id = auth.uid() or coalesce(public.is_admin(), false));

drop policy if exists "affc_select" on public.affiliate_clicks;
create policy "affc_select" on public.affiliate_clicks for select to authenticated
  using (affiliate_id = auth.uid() or coalesce(public.is_admin(), false));

drop policy if exists "affm_select" on public.affiliate_commissions;
create policy "affm_select" on public.affiliate_commissions for select to authenticated
  using (affiliate_id = auth.uid() or coalesce(public.is_admin(), false));
drop policy if exists "affm_update" on public.affiliate_commissions;
create policy "affm_update" on public.affiliate_commissions for update to authenticated
  using (coalesce(public.is_admin(), false)) with check (coalesce(public.is_admin(), false));

grant select, insert, update on public.affiliates to authenticated;
grant delete on public.affiliates to authenticated;
grant select, insert, update, delete on public.affiliate_products to authenticated;
grant select on public.affiliate_clicks, public.affiliate_commissions to authenticated;
grant update on public.affiliate_commissions to authenticated;

-- El afiliado no decide su estado ni su porcentaje: solo el admin.
create or replace function public.guardar_campos_afiliado()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if not coalesce(public.is_admin(), false) then
    if tg_op = 'INSERT' then
      new.status := 'activo';
      new.commission_rate := 10;
    else
      new.status := old.status;
      new.commission_rate := old.commission_rate;
      new.slug := old.slug;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists affiliates_guarda on public.affiliates;
create trigger affiliates_guarda before insert or update on public.affiliates
  for each row execute function public.guardar_campos_afiliado();

-- Clic público por enlace: resuelve el slug y registra (solo afiliados activos).
create or replace function public.registrar_clic_afiliado(p_slug text, p_product text)
returns boolean language plpgsql security definer set search_path to 'public' as $$
declare a uuid;
begin
  select id into a from public.affiliates where slug = lower(p_slug) and status = 'activo';
  if a is null then return false; end if;
  insert into public.affiliate_clicks (affiliate_id, product_id)
  values (a, (select id from public.products where id = p_product));
  return true;
end $$;

-- Vitrina pública: datos de presentación (sin teléfono ni pago) y productos ordenados.
create or replace function public.vitrina_afiliado(p_slug text)
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select jsonb_build_object(
    'slug', a.slug,
    'nombre', a.nombre || ' ' || a.apellido,
    'theme', a.theme,
    'productos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'titulo', p.title, 'precio', p.price, 'precio_anterior', p.compare_at_price,
        'imagen', coalesce(p.image, p.gallery->>0), 'tienda', s.name) order by ap.position, ap.created_at)
      from public.affiliate_products ap
      join public.products p on p.id = ap.product_id
      join public.stores s on s.id = p.store_id and s.approved
      where ap.affiliate_id = a.id), '[]'::jsonb))
  from public.affiliates a
  where a.slug = lower(p_slug) and a.status = 'activo';
$$;

revoke all on function public.registrar_clic_afiliado(text, text) from public;
revoke all on function public.vitrina_afiliado(text) from public;
grant execute on function public.registrar_clic_afiliado(text, text) to anon, authenticated;
grant execute on function public.vitrina_afiliado(text) to anon, authenticated;

-- Comisiones al crear la orden: un ítem con `ref` cuyo producto está en la vitrina del
-- afiliado activo genera comisión. Sin autorreferidos.
create or replace function public.crear_comisiones_afiliado()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare it jsonb; a record; precio numeric; cant integer; titulo text;
begin
  for it in select * from jsonb_array_elements(coalesce(new.items, '[]'::jsonb)) loop
    continue when coalesce(it->>'ref', '') = '';
    select af.id, af.commission_rate into a from public.affiliates af
      join public.affiliate_products ap on ap.affiliate_id = af.id and ap.product_id = it->>'id'
      where af.slug = lower(it->>'ref') and af.status = 'activo';
    continue when a.id is null or a.id = new.user_id;
    select p.price, p.title into precio, titulo from public.products p where p.id = it->>'id';
    continue when precio is null;
    cant := greatest(1, coalesce((it->>'cantidad')::integer, 1));
    insert into public.affiliate_commissions
      (affiliate_id, purchase_request_id, product_id, producto, cantidad, monto_venta, tasa, comision)
    values (a.id, new.id, it->>'id', titulo, cant, precio * cant, a.commission_rate,
            round(precio * cant * a.commission_rate / 100, 2))
    on conflict (purchase_request_id, product_id) do nothing;
  end loop;
  return null;
end $$;
drop trigger if exists purchase_requests_afiliados on public.purchase_requests;
create trigger purchase_requests_afiliados after insert on public.purchase_requests
  for each row execute function public.crear_comisiones_afiliado();

create or replace function public.estado_comisiones_afiliado()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.status = 'completada' then
    update public.affiliate_commissions set status = 'aprobada'
     where purchase_request_id = new.id and status = 'pendiente';
  elsif new.status = 'cancelada' then
    update public.affiliate_commissions set status = 'anulada'
     where purchase_request_id = new.id and status in ('pendiente', 'aprobada');
  end if;
  return null;
end $$;
drop trigger if exists purchase_requests_afiliados_estado on public.purchase_requests;
create trigger purchase_requests_afiliados_estado after update of status on public.purchase_requests
  for each row when (old.status is distinct from new.status)
  execute function public.estado_comisiones_afiliado();

do $$
declare t text;
begin
  foreach t in array array['affiliate_commissions', 'affiliate_clicks'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

commit;
