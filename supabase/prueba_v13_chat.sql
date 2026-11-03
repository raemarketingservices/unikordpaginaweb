-- Prueba funcional de migration_v13_chat.sql.
-- Se ejecuta DENTRO de una transacción que se revierte: nada de esto queda aplicado.
--
-- El que lanza esto entra como `postgres` (que tiene BYPASSRLS), así que para que las
-- políticas se evalúen de verdad cada caso cambia a `role authenticated` y fija
-- `request.jwt.claims`, que es de donde `auth.uid()` saca el sujeto.

\set ON_ERROR_STOP on
\echo '=== 0. Definiciones de auth.uid() en esta instancia ==='
select pg_get_functiondef('auth.uid()'::regprocedure);

-- ------------------------------------------------------------
-- Banco de pruebas desechable
-- ------------------------------------------------------------
create temp table t_ids (k text primary key, v uuid) on commit drop;
create temp table t_st (k text primary key, v text) on commit drop;

do $$
declare
  u_cliente uuid := gen_random_uuid();
  u_vend_a  uuid := gen_random_uuid();
  u_vend_b  uuid := gen_random_uuid();
  v_s1 text;
  v_s2 text;
  v_s_pendiente text;
begin
  -- No se inserta en `profiles` a mano: el disparador `handle_new_user` ya lo hace desde
  -- `raw_user_meta_data`, que es exactamente el camino del registro real en /auth.
  insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values (u_cliente, 'authenticated', 'authenticated', 'cliente.prueba@example.test',
            jsonb_build_object('full_name', 'Cliente Prueba'), now(), now()),
         (u_vend_a,  'authenticated', 'authenticated', 'venda.prueba@example.test',
            jsonb_build_object('full_name', 'Vendedora A', 'account_type', 'vendor'), now(), now()),
         (u_vend_b,  'authenticated', 'authenticated', 'vendb.prueba@example.test',
            jsonb_build_object('full_name', 'Vendedor B', 'account_type', 'vendor'), now(), now());

  if (select count(*) from public.profiles where id in (u_cliente, u_vend_a, u_vend_b)) <> 3 then
    raise exception 'FALLO: handle_new_user no creó los tres perfiles';
  end if;

  select id into v_s1 from public.stores where approved order by id limit 1;
  select id into v_s2 from public.stores where approved and id <> v_s1 order by id limit 1;
  if v_s1 is null or v_s2 is null then
    raise exception 'Hacen falta dos tiendas aprobadas para la prueba';
  end if;

  -- Una tienda pendiente, para probar que no se le puede escribir.
  v_s_pendiente := 'zz-prueba-pendiente';
  insert into public.stores (id, name, approved, owner_id, owner_name)
  values (v_s_pendiente, 'Prueba Pendiente', false, u_vend_b, 'Vendedor B');

  -- La aprobación es del admin, no del dueño: esto simula dos tiendas ya dadas de alta.
  update public.stores set owner_id = u_vend_a where id = v_s1;
  update public.stores set owner_id = u_vend_b where id = v_s2;

  insert into t_ids values ('cliente', u_cliente), ('venda', u_vend_a), ('vendb', u_vend_b);
  insert into t_st  values ('s1', v_s1), ('s2', v_s2), ('sp', v_s_pendiente);

  raise notice 'banco listo: s1=% s2=% pendiente=%', v_s1, v_s2, v_s_pendiente;
end $$;

select k, v from t_st order by k;

-- Atajo para los bloques que siguen.
create or replace function pg_temp.uid_de(p_k text) returns uuid
language sql stable as $$ select v from t_ids where k = p_k $$;
create or replace function pg_temp.st_de(p_k text) returns text
language sql stable as $$ select v from t_st where k = p_k $$;

-- Los objetos temporales son de la sesión (postgres) y la prueba cambia de rol: sin esto,
-- `authenticated` y `anon` no podrían leer el banco de pruebas.
grant select on t_ids, t_st to authenticated, anon;
grant execute on function pg_temp.uid_de(text), pg_temp.st_de(text) to authenticated, anon;

-- ------------------------------------------------------------
-- 1. cliente → tienda, e idempotencia
-- ------------------------------------------------------------
\echo ''
\echo '=== 1. iniciar_conversacion como cliente, dos veces: mismo id ==='
create temp table t_c1 (v uuid) on commit drop;
grant select, insert on t_c1 to authenticated, anon;
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', pg_temp.uid_de('cliente'), 'role', 'authenticated')::text, true);
insert into t_c1 select public.iniciar_conversacion(pg_temp.st_de('s1'));
insert into t_c1 select public.iniciar_conversacion(pg_temp.st_de('s1'));
reset role;
do $$
declare n int;
begin
  select count(distinct v) into n from t_c1;
  if n <> 1 then raise exception 'FALLO: dos llamadas dieron % ids distintos', n; end if;
  raise notice 'OK: idempotente, una sola conversación';
end $$;
select tipo, cliente_id is not null as tiene_cliente, partner_store_id is null as sin_partner
  from public.conversations where id = (select v from t_c1 limit 1);

-- ------------------------------------------------------------
-- 2. Escribir un mensaje y que el resumen se actualice solo
-- ------------------------------------------------------------
\echo ''
\echo '=== 2. mensaje del cliente + resumen en conversations ==='
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', pg_temp.uid_de('cliente'), 'role', 'authenticated')::text, true);
insert into public.conversation_messages (conversation_id, autor_id, cuerpo)
values ((select v from t_c1 limit 1), pg_temp.uid_de('cliente'), '¿Tienen ese artículo en azul?');
reset role;
select ultimo_mensaje, (ultimo_autor_id = pg_temp.uid_de('cliente')) as autor_correcto,
       ultimo_mensaje_at is not null as tiene_fecha
  from public.conversations where id = (select v from t_c1 limit 1);

-- ------------------------------------------------------------
-- 3. El dueño de la tienda lo ve y puede responder
-- ------------------------------------------------------------
\echo ''
\echo '=== 3. dueña de s1: ve el hilo y responde ==='
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', pg_temp.uid_de('venda'), 'role', 'authenticated')::text, true);
do $$
begin
  if not public.es_participante((select v from t_c1 limit 1)) then
    raise exception 'FALLO: la dueña de la tienda no aparece como participante';
  end if;
  if (select count(*) from public.conversation_messages
       where conversation_id = (select v from t_c1 limit 1)) <> 1 then
    raise exception 'FALLO: la dueña no lee el mensaje del cliente';
  end if;
  insert into public.conversation_messages (conversation_id, autor_id, cuerpo)
  values ((select v from t_c1 limit 1), pg_temp.uid_de('venda'), 'Sí, quedan tres.');
  raise notice 'OK: la dueña lee y responde';
end $$;
reset role;
select ultimo_mensaje from public.conversations where id = (select v from t_c1 limit 1);

-- ------------------------------------------------------------
-- 4. Un extraño no ve nada (RLS, no solo la función)
-- ------------------------------------------------------------
\echo ''
\echo '=== 4. vendedor B (ajeno al hilo): 0 filas visibles ==='
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', pg_temp.uid_de('vendb'), 'role', 'authenticated')::text, true);
do $$
declare n int; m int;
begin
  if public.es_participante((select v from t_c1 limit 1)) then
    raise exception 'FALLO: es_participante dijo true para un ajeno';
  end if;
  select count(*) into n from public.conversations where id = (select v from t_c1 limit 1);
  select count(*) into m from public.conversation_messages
    where conversation_id = (select v from t_c1 limit 1);
  if n <> 0 or m <> 0 then
    raise exception 'FALLO: RLS dejó ver % conversaciones y % mensajes a un ajeno', n, m;
  end if;
  raise notice 'OK: RLS cierra el hilo al ajeno (0 y 0)';
end $$;

-- Y tampoco puede colarse escribiendo.
do $$
begin
  begin
    insert into public.conversation_messages (conversation_id, autor_id, cuerpo)
    values ((select v from t_c1 limit 1), pg_temp.uid_de('vendb'), 'intruso');
    raise exception 'FALLO: un ajeno pudo escribir en el hilo';
  exception when insufficient_privilege or check_violation then
    raise notice 'OK: escritura del ajeno rechazada (%)', SQLERRM;
  end;
end $$;

-- Ni puede suplantar al cliente como autor.
do $$
begin
  begin
    insert into public.conversation_messages (conversation_id, autor_id, cuerpo)
    values ((select v from t_c1 limit 1), pg_temp.uid_de('cliente'), 'suplantado');
    raise exception 'FALLO: se pudo escribir un mensaje con autor ajeno';
  exception when insufficient_privilege or check_violation then
    raise notice 'OK: autor_id distinto de auth.uid() rechazado (%)', SQLERRM;
  end;
end $$;
reset role;

-- ------------------------------------------------------------
-- 5. tienda ↔ tienda, con orden canónico
-- ------------------------------------------------------------
\echo ''
\echo '=== 5. tienda_tienda: A→B y B→A deben dar la misma conversación ==='
create temp table t_c2 (v uuid) on commit drop;
grant select, insert on t_c2 to authenticated, anon;
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', pg_temp.uid_de('venda'), 'role', 'authenticated')::text, true);
insert into t_c2 select public.iniciar_conversacion(pg_temp.st_de('s2'), pg_temp.st_de('s1'));
reset role;
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', pg_temp.uid_de('vendb'), 'role', 'authenticated')::text, true);
insert into t_c2 select public.iniciar_conversacion(pg_temp.st_de('s1'), pg_temp.st_de('s2'));
reset role;
do $$
declare n int;
begin
  select count(distinct v) into n from t_c2;
  if n <> 1 then raise exception 'FALLO: el orden canónico no funcionó, % hilos', n; end if;
  raise notice 'OK: A→B y B→A son el mismo hilo';
end $$;
select tipo, store_id, partner_store_id, cliente_id
  from public.conversations where id = (select v from t_c2 limit 1);

-- Ambos dueños participan.
do $$
begin
  if not public.es_participante((select v from t_c2 limit 1)) then
    raise exception 'FALLO: el dueño de s2 no participa en el hilo tienda-tienda';
  end if;
  raise notice 'OK: el dueño de s2 participa';
end $$;

-- ------------------------------------------------------------
-- 6. Guardas de iniciar_conversacion
-- ------------------------------------------------------------
\echo ''
\echo '=== 6. Guardas ==='
-- Un cliente sin tienda no puede abrir un hilo tienda-tienda.
-- Ojo con la identidad: `reset role` no limpia `request.jwt.claims`, así que sin este
-- `set_config` el bloque seguiría corriendo como el vendedor del caso anterior (que sí
-- es dueño) y la guarda, correctamente, le dejaría pasar.
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', pg_temp.uid_de('cliente'), 'role', 'authenticated')::text, true);
do $$
begin
  begin
    perform public.iniciar_conversacion(pg_temp.st_de('s1'), pg_temp.st_de('s2'));
    raise exception 'FALLO: un cliente sin tienda abrió un hilo tienda-tienda';
  exception when insufficient_privilege then
    raise notice 'OK: cliente sin tienda rechazado (%)', SQLERRM;
  end;
end $$;
reset role;

-- Una tienda no habla consigo misma.
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', pg_temp.uid_de('venda'), 'role', 'authenticated')::text, true);
do $$
begin
  begin
    perform public.iniciar_conversacion(pg_temp.st_de('s1'), pg_temp.st_de('s1'));
    raise exception 'FALLO: se abrió un hilo de una tienda consigo misma';
  exception when no_data_found or raise_exception then
    raise notice 'OK: tienda consigo misma rechazada (%)', SQLERRM;
  end;
end $$;
reset role;

-- Tienda inexistente y tienda pendiente, como postgres (sin JWT) y luego con JWT.
do $$
begin
  begin
    perform public.iniciar_conversacion('no-existe-esta-tienda');
    raise exception 'FALLO: se abrió hilo con una tienda que no existe';
  exception when no_data_found or raise_exception then
    raise notice 'OK: tienda inexistente rechazada (%)', SQLERRM;
  end;
  begin
    perform public.iniciar_conversacion(pg_temp.st_de('sp'));
    raise exception 'FALLO: se abrió hilo con una tienda pendiente de aprobación';
  exception when no_data_found or raise_exception then
    raise notice 'OK: tienda pendiente rechazada (%)', SQLERRM;
  end;
end $$;

-- Sin sesión.
select set_config('request.jwt.claims', '', true);
do $$
begin
  begin
    perform public.iniciar_conversacion(pg_temp.st_de('s1'));
    raise exception 'FALLO: un anónimo abrió una conversación';
  exception when invalid_authorization_specification then
    raise notice 'OK: sin sesión rechazada (%)', SQLERRM;
  end;
end $$;

-- ------------------------------------------------------------
-- 7. Marca de lectura
-- ------------------------------------------------------------
\echo ''
\echo '=== 7. marcar_conversacion_leida ==='
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', pg_temp.uid_de('cliente'), 'role', 'authenticated')::text, true);
select public.marcar_conversacion_leida((select v from t_c1 limit 1));
do $$
declare r timestamptz; u timestamptz;
begin
  select leido_hasta into r from public.conversation_reads
    where conversation_id = (select v from t_c1 limit 1) and profile_id = pg_temp.uid_de('cliente');
  select max(created_at) into u from public.conversation_messages
    where conversation_id = (select v from t_c1 limit 1);
  if r is null then raise exception 'FALLO: no quedó marca de lectura'; end if;
  if r <> u then raise exception 'FALLO: leido_hasta (%) no es el último mensaje (%)', r, u; end if;
  raise notice 'OK: leido_hasta coincide con el último mensaje';
end $$;
reset role;

-- Un ajeno no puede marcar leído.
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', pg_temp.uid_de('vendb'), 'role', 'authenticated')::text, true);
do $$
begin
  begin
    perform public.marcar_conversacion_leida((select v from t_c1 limit 1));
    raise exception 'FALLO: un ajeno marcó leído un hilo que no es suyo';
  exception when insufficient_privilege then
    raise notice 'OK: marcar leído rechazado al ajeno (%)', SQLERRM;
  end;
end $$;
reset role;

-- ------------------------------------------------------------
-- 8. Anónimo
-- ------------------------------------------------------------
-- Aquí no se comprueba "0 filas": se comprueba rechazo. La migración quita los permisos
-- de tabla y el EXECUTE a `anon`, así que un visitante sin sesión ni siquiera llega a
-- preguntar — que es más fuerte que una política bien escrita.
\echo ''
\echo '=== 8. Sesión anónima: sin permisos, ni para preguntar ==='
set role anon;
do $$
begin
  begin
    perform public.es_participante((select v from t_c1 limit 1));
    raise exception 'FALLO: un anónimo pudo ejecutar es_participante';
  exception when insufficient_privilege then
    raise notice 'OK: es_participante negada al anónimo';
  end;
  begin
    perform public.iniciar_conversacion(pg_temp.st_de('s1'));
    raise exception 'FALLO: un anónimo pudo ejecutar iniciar_conversacion';
  exception when insufficient_privilege then
    raise notice 'OK: iniciar_conversacion negada al anónimo';
  end;
  begin
    perform count(*) from public.conversations;
    raise exception 'FALLO: un anónimo pudo leer public.conversations';
  exception when insufficient_privilege then
    raise notice 'OK: lectura de conversations negada al anónimo';
  end;
  begin
    perform count(*) from public.conversation_messages;
    raise exception 'FALLO: un anónimo pudo leer public.conversation_messages';
  exception when insufficient_privilege then
    raise notice 'OK: lectura de conversation_messages negada al anónimo';
  end;
end $$;
reset role;

-- Y el dueño del hilo sigue viéndolo después de todo lo anterior. El cliente solo tiene
-- un hilo: el tienda↔tienda de la sección 5 no es suyo, así que no debe aparecerle.
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', pg_temp.uid_de('cliente'), 'role', 'authenticated')::text, true);
do $$
declare n int;
begin
  select count(*) into n from public.conversations;
  if n <> 1 then
    raise exception 'FALLO: el cliente debería ver 1 hilo y ve %', n;
  end if;
  if (select v from t_c1 limit 1) is distinct from (select id from public.conversations limit 1) then
    raise exception 'FALLO: el hilo visible no es el del cliente';
  end if;
  raise notice 'OK: el cliente ve exactamente su hilo, ni uno más';
end $$;
reset role;

-- ------------------------------------------------------------
-- 9. Borrar no está permitido para nadie
-- ------------------------------------------------------------
\echo ''
\echo '=== 9. delete revocado ==='
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', pg_temp.uid_de('cliente'), 'role', 'authenticated')::text, true);
do $$
begin
  begin
    delete from public.conversation_messages
      where conversation_id = (select v from t_c1 limit 1);
    raise exception 'FALLO: el cliente pudo borrar mensajes';
  exception when insufficient_privilege then
    raise notice 'OK: delete rechazado (%)', SQLERRM;
  end;
end $$;
reset role;

\echo ''
\echo '=== resumen final (antes del rollback) ==='
select (select count(*) from public.conversations) as conversaciones,
       (select count(*) from public.conversation_messages) as mensajes,
       (select count(*) from public.conversation_reads) as lecturas;
select tipo, store_id, partner_store_id is not null as con_partner,
       cliente_id is not null as con_cliente, ultimo_mensaje
  from public.conversations order by created_at;
