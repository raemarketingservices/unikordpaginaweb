-- ============================================================
-- UNIKO-RD · v13 — Conversaciones dentro del marketplace
-- Aplica sobre schema.sql + migration_v2..v12.
-- ============================================================
--
-- `/mensajes` llamaba a `/local-api/messages`, un middleware de Vite que guarda en un
-- JSON del disco, solo se monta con `UNIKO_LOCAL_MESSAGES=true` y delega el login en un
-- worker de Cloudflare que ya no existe. En producción no hay ninguna tabla de mensajes,
-- así que la pantalla solo podía dar error. Esto la sustituye por algo real.
--
-- Dos clases de conversación, la misma estructura:
--   · cliente_tienda — un comprador escribe a una tienda aprobada. Una por par.
--   · tienda_tienda  — el dueño de una tienda escribe a otra. El par se guarda en orden
--     canónico de slug para que A→B y B→A sean la misma fila.
--
-- Quién pertenece a la conversación NO se guarda en una tabla de miembros: se deriva de
-- `stores.owner_id`. Las 8 tiendas actuales tienen `owner_id = NULL`, y cuando se les
-- asigne dueño o se lo cambien, la pertenencia tiene que seguir al dueño sin migrar filas.
-- El precio es un `exists` por fila en la política; con un índice sobre `owner_id` y el
-- volumen de un marketplace provincial, eso es despreciable.

begin;

-- ------------------------------------------------------------
-- 1. Tablas
-- ------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('cliente_tienda', 'tienda_tienda')),
  -- En tienda_tienda es siempre el menor de los dos slugs (orden canónico).
  store_id text not null references public.stores (id) on delete cascade,
  partner_store_id text references public.stores (id) on delete cascade,
  cliente_id uuid references public.profiles (id) on delete cascade,
  -- Desnormalizado por el list lateral: sin esto cada conversación cuesta un viaje más
  -- para saber de qué se habló por última vez y si el último fue uno mismo.
  ultimo_mensaje text,
  ultimo_mensaje_at timestamptz,
  ultimo_autor_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  -- Cada clase lleva exactamente su lado extra, y una tienda no habla consigo misma.
  check ((tipo = 'cliente_tienda') = (cliente_id is not null)),
  check ((tipo = 'tienda_tienda') = (partner_store_id is not null)),
  check (partner_store_id is null or partner_store_id <> store_id)
);

create unique index if not exists conversations_unica_cliente
  on public.conversations (store_id, cliente_id) where tipo = 'cliente_tienda';
create unique index if not exists conversations_unica_tienda
  on public.conversations (store_id, partner_store_id) where tipo = 'tienda_tienda';
create index if not exists conversations_cliente_idx
  on public.conversations (cliente_id, ultimo_mensaje_at desc);
create index if not exists conversations_tienda_idx
  on public.conversations (store_id, ultimo_mensaje_at desc);

create table if not exists public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  autor_id uuid not null references public.profiles (id) on delete cascade,
  cuerpo text not null,
  created_at timestamptz not null default now(),
  check (char_length(btrim(cuerpo)) between 1 and 4000)
);

create index if not exists conversation_messages_hilo_idx
  on public.conversation_messages (conversation_id, created_at, id);

-- Marca de lectura por persona, para el contador de no leídos del list lateral.
create table if not exists public.conversation_reads (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  leido_hasta timestamptz not null default now(),
  primary key (conversation_id, profile_id)
);

-- ------------------------------------------------------------
-- 2. Quién participa
-- ------------------------------------------------------------
-- `security definer` a propósito: las políticas de `conversation_messages` la llaman por
-- fila, y si resolviera a través del RLS de `conversations` se armaría un ciclo de
-- políticas anidadas. Como definer, entra directo y responde con una sola consulta.
-- Con `auth.uid()` vacío (sesión anónima) las comparaciones dan NULL y no hay filas:
-- cierra en falso, que es lo que se quiere.
create or replace function public.es_participante(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.conversations c
    where c.id = p_conversation_id
      and (
        coalesce(public.is_admin(), false)
        or (c.cliente_id is not null and c.cliente_id = auth.uid())
        or exists (
          select 1 from public.stores s
          where s.owner_id = auth.uid()
            and (s.id = c.store_id or s.id = c.partner_store_id)
        )
      )
  );
$$;

-- ------------------------------------------------------------
-- 3. Políticas
-- ------------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.conversation_messages enable row level security;
alter table public.conversation_reads enable row level security;

-- El esquema base repartió permisos a lo bruto sobre las tablas que existían entonces;
-- estas son nuevas y se abren una por una. Nada de delete: un hilo de venta es también
-- el registro de lo que se pactó.
revoke all on public.conversations, public.conversation_messages, public.conversation_reads
  from anon, authenticated;

grant select on public.conversations to authenticated;
grant select, insert on public.conversation_messages to authenticated;
grant select, insert, update on public.conversation_reads to authenticated;

-- Las conversaciones nacen solo por `iniciar_conversacion()` y el resumen lo escribe el
-- disparador del punto 4; por eso aquí no hay insert ni update para nadie.
drop policy if exists conversations_select on public.conversations;
create policy conversations_select
  on public.conversations for select to authenticated
  using (public.es_participante(id));

drop policy if exists conversation_messages_select on public.conversation_messages;
create policy conversation_messages_select
  on public.conversation_messages for select to authenticated
  using (public.es_participante(conversation_id));

drop policy if exists conversation_messages_insert on public.conversation_messages;
create policy conversation_messages_insert
  on public.conversation_messages for insert to authenticated
  with check (
    autor_id = auth.uid() and public.es_participante(conversation_id)
  );

drop policy if exists conversation_reads_propias on public.conversation_reads;
create policy conversation_reads_propias
  on public.conversation_reads for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid() and public.es_participante(conversation_id));

-- ------------------------------------------------------------
-- 4. El resumen de la conversación
-- ------------------------------------------------------------
create or replace function public.conversation_actualizar_ultimo()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cuerpo text := btrim(new.cuerpo);
begin
  if char_length(v_cuerpo) > 140 then
    v_cuerpo := left(v_cuerpo, 140) || '…';
  end if;

  update public.conversations
     set ultimo_mensaje    = v_cuerpo,
         ultimo_mensaje_at = new.created_at,
         ultimo_autor_id   = new.autor_id
   where id = new.conversation_id;

  return new;
end;
$$;

drop trigger if exists conversation_messages_resumen on public.conversation_messages;
create trigger conversation_messages_resumen
  after insert on public.conversation_messages
  for each row execute function public.conversation_actualizar_ultimo();

-- ------------------------------------------------------------
-- 5. Abrir (o recuperar) una conversación
-- ------------------------------------------------------------
-- Idempotente a propósito: el botón de "Contactar" se puede pulsar dos veces y el cliente
-- no tiene forma de saber si el hilo ya existe sin leerlo primero, que es una carrera.
-- Devuelve el id de la conversación, nueva o existente.
create or replace function public.iniciar_conversacion(
  p_store_id text,
  p_partner_store_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_llamante uuid := auth.uid();
  v_destino text := btrim(coalesce(p_store_id, ''));
  v_a text;
  v_b text;
  v_existente uuid;
  v_nueva uuid;
begin
  if v_llamante is null then
    raise exception 'sesion_requerida' using errcode = '28000';
  end if;

  -- ---- cliente → tienda ----
  if p_partner_store_id is null then
    if not exists (
      select 1 from public.stores where id = v_destino and approved
    ) then
      raise exception 'tienda_no_disponible' using errcode = 'P0002';
    end if;

    select c.id into v_existente
    from public.conversations c
    where c.tipo = 'cliente_tienda'
      and c.store_id = v_destino
      and c.cliente_id = v_llamante;

    if v_existente is not null then
      return v_existente;
    end if;

    insert into public.conversations (tipo, store_id, cliente_id)
    values ('cliente_tienda', v_destino, v_llamante)
    returning id into v_nueva;

    return v_nueva;
  end if;

  -- ---- tienda → tienda ----
  -- Orden canónico: sin él, A escribiendo a B y B escribiendo a A crearían dos hilos
  -- paralelos del mismo par y el índice único no los alcanzaría a ver.
  v_a := least(v_destino, btrim(p_partner_store_id));
  v_b := greatest(v_destino, btrim(p_partner_store_id));

  if v_a = v_b then
    raise exception 'tienda_duplicada' using errcode = 'P0002';
  end if;

  if (select count(*) from public.stores where id in (v_a, v_b) and approved) <> 2 then
    raise exception 'tienda_no_disponible' using errcode = 'P0002';
  end if;

  -- Solo escribe una tienda quien tiene una tienda aprobada, y solo a otra distinta.
  if not exists (
    select 1 from public.stores s
    where s.owner_id = v_llamante and s.approved and s.id in (v_a, v_b)
  ) and not coalesce(public.is_admin(), false) then
    raise exception 'sin_tienda_propia' using errcode = '42501';
  end if;

  select c.id into v_existente
  from public.conversations c
  where c.tipo = 'tienda_tienda'
    and c.store_id = v_a
    and c.partner_store_id = v_b;

  if v_existente is not null then
    return v_existente;
  end if;

  insert into public.conversations (tipo, store_id, partner_store_id)
  values ('tienda_tienda', v_a, v_b)
  returning id into v_nueva;

  return v_nueva;
end;
$$;

-- ------------------------------------------------------------
-- 6. Marca de lectura
-- ------------------------------------------------------------
create or replace function public.marcar_conversacion_leida(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_llamante uuid := auth.uid();
  v_hasta timestamptz;
begin
  if v_llamante is null then
    return;
  end if;

  if not public.es_participante(p_conversation_id) then
    raise exception 'sin_acceso' using errcode = '42501';
  end if;

  -- Se marca hasta el último mensaje que existe AHORA, no hasta `now()`: entre que el
  -- cliente abre el hilo y llega la petición puede haber entrado un mensaje nuevo, y
  -- marcarlo de leído sin haberlo visto es justo el fallo que el contador no perdona.
  select max(m.created_at) into v_hasta
  from public.conversation_messages m
  where m.conversation_id = p_conversation_id;

  if v_hasta is null then
    return;
  end if;

  insert into public.conversation_reads (conversation_id, profile_id, leido_hasta)
  values (p_conversation_id, v_llamante, v_hasta)
  on conflict (conversation_id, profile_id)
  do update set leido_hasta = greatest(conversation_reads.leido_hasta, excluded.leido_hasta);
end;
$$;

revoke all on function public.es_participante(uuid),
                        public.iniciar_conversacion(text, text),
                        public.marcar_conversacion_leida(uuid)
  from public, anon;
grant execute on function public.es_participante(uuid),
                         public.iniciar_conversacion(text, text),
                         public.marcar_conversacion_leida(uuid)
  to authenticated;

-- ------------------------------------------------------------
-- 7. Tiempo real
-- ------------------------------------------------------------
-- El Realtime del homelab corre la extensión `postgres_cdc_rls`, o sea que filtra el WAL
-- por las políticas de cada tabla según el JWT del suscrito: un cliente solo recibe los
-- hilos en los que participa. Sin eso, suscribirse a `conversation_messages` repartiría
-- los mensajes de todo el marketplace a cualquiera.
--
-- `replica identity full` porque el CDC con RLS necesita ver la fila completa para
-- decidir si el suscrito puede recibirla.
alter table public.conversations replica identity full;
alter table public.conversation_messages replica identity full;

do $$
declare
  v_tabla text;
begin
  foreach v_tabla in array array['conversations', 'conversation_messages'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = v_tabla
    ) then
      execute format('alter publication supabase_realtime add table public.%I', v_tabla);
    end if;
  end loop;
end;
$$;

commit;
