-- ============================================================
-- UNIKO-RD · v12 — La venta mueve el inventario
-- Aplica sobre schema.sql + migration_v2..v11.
-- ============================================================
--
-- v9 añadió `products.stock_quantity` y la web ya muestra la disponibilidad real,
-- pero nada la descontaba: el número solo cambiaba cuando el vendedor lo editaba a
-- mano. El bot del CRM responde con esa cifra, así que una venta sin descuento es
-- una mentira que el bot repite.
--
-- Se descuenta al ENTRAR en `confirmada`, en la base de datos y no en el cliente,
-- por dos razones:
--   · v8 dejó `grant update (status)`: el vendedor no puede escribir ninguna otra
--     columna de `purchase_requests`, y `products` del pedido tampoco le pertenece
--     si la orden es de varias tiendas. Un update directo desde el navegador no
--     tiene cómo ser autorizado correctamente.
--   · el mismo disparador cubre a todos los que confirman: el panel del vendedor,
--     el del admin, la app Android y lo que venga después.
--
-- Las órdenes que YA estaban en `confirmada` antes de esta migración no se tocan:
-- el disparador solo salta cuando el estado cambia.

begin;

-- ------------------------------------------------------------
-- 1. Libro de movimientos. Es a la vez el registro de lo que se descontó (un
--    descuento automático y silencioso sin rastro no se puede depurar) y la
--    guarda de idempotencia: una tienda aparece una sola vez por orden, por
--    más que el vendedor haga doble clic o el cliente reintente.
-- ------------------------------------------------------------
create table if not exists public.order_stock_movements (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.purchase_requests (id) on delete cascade,
  store_id text not null references public.stores (id) on delete cascade,
  -- nulo cuando el ítem no se pudo resolver contra ningún producto del catálogo
  product_id text references public.products (id) on delete set null,
  titulo text not null,
  pedido integer not null check (pedido > 0),
  descontado integer not null default 0 check (descontado >= 0),
  -- ok · faltante · agotado · sin_producto · sin_control
  motivo text not null default 'ok',
  created_at timestamptz not null default now()
);

create index if not exists order_stock_movements_request_idx
  on public.order_stock_movements (request_id, store_id);

-- Escritura solo del disparador (que es security definer y por tanto dueño de la
-- tabla); el vendedor y el admin leen lo suyo. Sin políticas de insert/update/
-- delete, un cliente no puede inventarse movimientos.
alter table public.order_stock_movements enable row level security;

revoke all on public.order_stock_movements from anon, authenticated;
grant select on public.order_stock_movements to authenticated;

drop policy if exists order_stock_movements_select on public.order_stock_movements;
create policy order_stock_movements_select
  on public.order_stock_movements for select to authenticated
  using (
    exists (
      select 1 from public.stores s
      where s.id = order_stock_movements.store_id and s.owner_id = auth.uid()
    )
    or coalesce(public.is_admin(), false)
  );

-- ------------------------------------------------------------
-- 2. El descuento
-- ------------------------------------------------------------
create or replace function public.descontar_existencias_al_confirmar()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_llamante uuid := auth.uid();
  v_admin boolean := coalesce(public.is_admin(), false);
  -- Todo en escalares tipados: PL/pgSQL cachea los planes de estas consultas por
  -- sesión, y un campo de `record` (o de NEW) les llega con un tipo que solo se
  -- resuelve en tiempo de ejecución.
  v_pedido uuid := new.id;
  v_estado_viejo text := old.status;
  v_estado_nuevo text := new.status;
  v_store_ids text[] := new.store_ids;
  v_items jsonb := new.items;
  v_tienda_id text;
  v_tienda_nombre text;
  v_stock_enabled boolean;
  v_item jsonb;
  v_producto public.products;
  v_producto_id text;
  v_cantidad integer;
  v_descontado integer;
  v_titulo text;
  v_motivo text;
begin
  -- Solo al entrar en 'confirmada'. Salir de ese estado NO devuelve existencias:
  -- una cancelación puede llegar con la mercancía ya despachada, y esa devolución
  -- la decide el vendedor a mano en el panel de inventario.
  if v_estado_nuevo is distinct from 'confirmada' or v_estado_viejo = 'confirmada' then
    return new;
  end if;

  for v_tienda_id, v_tienda_nombre, v_stock_enabled in
    select s.id, s.name, s.stock_enabled
    from public.stores s
    where
      -- Sin sesión (service_role, psql del homelab, seeds) o siendo admin se
      -- confirma la orden completa; un vendedor solo sus tiendas del pedido.
      (v_llamante is null or v_admin or s.owner_id = v_llamante)
      and (
        s.id = any (coalesce(v_store_ids, '{}'))
        -- Órdenes antiguas y de la app: store_ids vacío, el vínculo es el nombre
        -- de la tienda guardado en cada ítem.
        or exists (
          select 1
          from jsonb_array_elements(coalesce(v_items, '[]'::jsonb)) it
          where it->>'tienda' = s.name
        )
      )
  loop
    if exists (
      select 1 from public.order_stock_movements m
      where m.request_id = v_pedido and m.store_id = v_tienda_id
    ) then
      continue;
    end if;

    for v_item in select * from jsonb_array_elements(coalesce(v_items, '[]'::jsonb))
    loop
      if coalesce(v_item->>'tienda', '') <> v_tienda_nombre then
        continue;
      end if;

      v_titulo := coalesce(nullif(btrim(v_item->>'titulo'), ''), '(sin título)');
      -- La cantidad viene de un JSON que escribieron tres clientes distintos
      -- (web, app, seed): se limpian los no-dígitos antes de convertir.
      v_cantidad := coalesce(
        nullif(regexp_replace(coalesce(v_item->>'cantidad', ''), '\D', '', 'g'), '')::integer,
        1
      );
      if v_cantidad < 1 then
        v_cantidad := 1;
      end if;

      -- El ítem trae el id del producto cuando la orden nació del catálogo vivo,
      -- y un slug cuando nació del catálogo local o de D1. Se prueba todo y se
      -- desempata por precisión; `for update` serializa dos confirmaciones que
      -- toquen el mismo producto a la vez.
      select p.* into v_producto
      from public.products p
      where p.store_id = v_tienda_id
        and (
             p.id = coalesce(v_item->>'id', '')
          or lower(p.title) = lower(v_titulo)
          or (nullif(v_item->>'id', '') is not null and lower(coalesce(p.sku, '')) = lower(v_item->>'id'))
        )
      order by
        (p.id = coalesce(v_item->>'id', '')) desc,
        (lower(p.title) = lower(v_titulo)) desc,
        p.created_at
      limit 1
      for update;

      if not found then
        insert into public.order_stock_movements
          (request_id, store_id, product_id, titulo, pedido, descontado, motivo)
        values (v_pedido, v_tienda_id, null, v_titulo, v_cantidad, 0, 'sin_producto');
        continue;
      end if;

      v_producto_id := v_producto.id;

      -- La tienda que no lleva inventario, o el producto que no lo controla, no
      -- tienen número que descontar (mismo criterio que la web y que el bot).
      if not v_stock_enabled or not v_producto.track_inventory then
        insert into public.order_stock_movements
          (request_id, store_id, product_id, titulo, pedido, descontado, motivo)
        values (v_pedido, v_tienda_id, v_producto_id, v_titulo, v_cantidad, 0, 'sin_control');
        continue;
      end if;

      -- `stock_quantity >= 0` es un check de v9: vender más de lo que hay no
      -- puede reventar la confirmación, se descuenta hasta cero y se anota.
      v_descontado := least(v_cantidad, v_producto.stock_quantity);

      if v_descontado > 0 then
        update public.products
           set stock_quantity = stock_quantity - v_descontado
         where id = v_producto_id;
      end if;

      v_motivo := case
        when v_descontado = v_cantidad then 'ok'
        when v_descontado = 0 then 'agotado'
        else 'faltante'
      end;

      insert into public.order_stock_movements
        (request_id, store_id, product_id, titulo, pedido, descontado, motivo)
      values (v_pedido, v_tienda_id, v_producto_id, v_titulo, v_cantidad, v_descontado, v_motivo);
    end loop;
  end loop;

  return new;
end;
$$;

drop trigger if exists purchase_requests_desconta_existencias on public.purchase_requests;
create trigger purchase_requests_desconta_existencias
  before update of status on public.purchase_requests
  for each row execute function public.descontar_existencias_al_confirmar();

commit;
