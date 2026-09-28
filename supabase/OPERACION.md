# UNIKO-RD: Supabase

La aplicacion usa Auth, Postgres y Storage del VPS configurado en `.env.local`.
El navegador solo recibe `VITE_SUPABASE_URL` y la clave publica
`VITE_SUPABASE_PUBLISHABLE_KEY`. No colocar claves secretas en variables VITE.

## Migraciones

La instancia existente ya contiene el esquema y las migraciones v2/v3.
Se aplico `migration_v4.sql` de forma incremental. No ejecutar `schema.sql`
sobre esta instancia: ese archivo elimina los datos existentes.

La copia previa del esquema public y sus datos se encuentra en el VPS:
`/root/unikord-before-v4-20260925.sql`.

La migracion v4 agrega SKU secuenciales unicos e inmutables, precios con
centavos, proteccion de los campos de verificacion y valoraciones, conteo de
productos y la funcion `marketplace_chatbot_catalog`. Esta funcion filtra
tiendas y productos usando `chatbot_settings` antes de devolverlos al widget.

La migracion v5 agrega `stores.owner_name`, el nombre del propietario que se
muestra en el perfil publico de la tienda (`profiles` no es publico, por eso se
denormaliza en la tienda). Se aplico con
`docker exec -i supabase-db psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -f - < migration_v5.sql`
y luego `notify pgrst, 'reload schema';` para que PostgREST publique la columna.

## Flujos

- `/auth?modo=crear`: cuenta de usuario o tienda. Si se elige "Tienda" el
  formulario pide ademas nombre, categoria, ubicacion, descripcion y logo
  (PNG o JPG) de la tienda, y la crea en el mismo paso con
  `owner_name` = nombres y apellidos del usuario. Si la sesion no viene
  confirmada, se queda en `/vender` para completarla ahi.
- `/cuenta`: nombres, apellidos, cedula, telefono y foto de perfil. Al guardar
  tambien se actualiza `stores.owner_name` de la tienda del usuario.
- `/vender`: nombre comercial, nombre y apellido del propietario (se copia a
  `stores.owner_name` y completa el perfil si estaba vacio), RNC opcional,
  descripcion, logo en PNG o JPG y portada.
- `/publicar`: fotos, videos, precio y SKU asignado por Postgres al publicar.
- `/tiendas/:id`: propietario, descripcion, catalogo y una valoracion de 1 a 5
  por usuario, modificable.
- `/admin`: usuarios, tiendas (verificar, destacar y eliminar una o todas,
  con confirmacion; el borrado en Supabase arrastra productos y resenas),
  articulos y configuracion del chatbot. Requiere un perfil con rol `admin`;
  el registro publico nunca asigna ese rol.

Los perfiles personales solo son visibles para su titular y los administradores.
Las fotos admiten JPG, PNG, WebP y GIF hasta 10 MB; los videos admiten MP4,
WebM y MOV hasta 50 MB. El formulario permite hasta 10 archivos por tipo.

El chatbot es un asistente de busqueda del catalogo, sin modelo generativo
externo. Consulta Supabase en cada mensaje; permite buscar por nombre,
descripcion, categoria, tienda y SKU. El administrador puede cambiar el saludo,
desactivarlo y permitir todas, algunas o ninguna tienda.

## Despliegue en el VPS

La app corre en el mismo VPS que Supabase (84.46.254.137) como contenedor
Docker `uniko-web`, publicado en el puerto 8090 y en `https://uniko-rd.com`
(con `www` apuntando al mismo sitio).

El dominio lo enruta el Traefik de Coolify (`coolify-proxy`, puertos 80/443),
que emite el certificado Let's Encrypt. Los ruteos viven en las etiquetas
`traefik.*` de los contenedores:

- `uniko-web` (`/opt/uniko-rd/docker-compose.yml`): todo el trafico HTTP de
  `uniko-rd.com` / `www.uniko-rd.com`, con redireccion 301 a HTTPS.
- `supabase-envoy` (`/root/supabase/docker/docker-compose.yml`): las rutas de
  la API (`/rest/v1`, `/auth/v1`, `/storage/v1`, `/functions/v1`,
  `/realtime/v1`, `/graphql/v1`, `/pg/`) con prioridad 100, ambas redes
  `supabase_default` y `coolify`.

Ambos contenedores estan en dos redes y por eso llevan
`traefik.docker.network=coolify`. Sin esa etiqueta Traefik puede elegir la otra
IP (por ejemplo `172.18.0.x` para el envoy), que no es alcanzable desde el
contenedor de Traefik: la conexion se queda sin respuesta y la peticion acaba
en 504 a los 30 segundos. Si se recrea el proxy o cambian las redes, revisar
esa etiqueta en ambos compose.

Por eso `VITE_SUPABASE_URL` es `https://uniko-rd.com`: el navegador habla con
Supabase por el mismo origen, asi no hay contenido mixto ni CORS. Los builds de
produccion deben usar ese valor (`.env.local` ya lo trae).

Despliegue automatico (vigente desde 2026-09-28):

1. `git push origin main` desde cualquier equipo.
2. GitHub entrega el push a `https://uniko-rd.com/webhooks/source/github/events/manual`
   (firma HMAC con el secret del webhook, guardado en la app de Coolify como
   `manual_webhook_secret_github`).
3. Coolify reconstruye la imagen con el `Dockerfile` (multi-stage con
   `NITRO_PRESET=node-server`) y redespliega el recurso `unikord-web`
   (proyecto `unikord` / environment `production`), que sirve
   `https://uniko-rd.com` y `https://www.uniko-rd.com`.

El stack manual `/opt/uniko-rd` quedo en parada y funciona como rollback:
`cd /opt/uniko-rd && docker compose up -d --build`.

Migraciones incrementales de BD (aplicar antes del push correspondiente):
`docker exec -i supabase-db psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -f - < supabase/migration_vN.sql`.
La `migration_v6.sql` (consentimientos de registro, Ley 158-13) ya esta
aplicada.

Despliegue manual (solo como alternativa al automatico):

1. `VITE_SUPABASE_URL=https://uniko-rd.com NITRO_PRESET=node-server npm run build`
2. `tar --exclude='.output/public/_libs' -czf uniko-deploy.tar.gz .output`
3. Subir el paquete con `scripts/vps-upload.py` (requiere `VPS_PASS` en el
   entorno; la contrasena nunca se guarda en el repo).
4. En el VPS: `cd /opt/uniko-rd && rm -rf .output && tar -xzf
/root/uniko-deploy.tar.gz && docker compose up -d --build`. El `rm -rf`
   evita arrastrar assets de builds anteriores.

El contenedor sirve el build Nitro standalone con Node 22, publicado en el
puerto 8090 del host y con `restart: unless-stopped`. Supabase sigue en sus
puertos propios (8000); la app le habla desde el navegador y desde el SSR a
traves del mismo dominio.

## Desarrollo y pruebas

`npm run dev -- --host 127.0.0.1 --port 5051`

`npx tsc --noEmit` y `npm run build` verifican tipos y compilacion.

La prueba de integracion se ejecuta con:
`node --env-file=.env.local scripts/verify-marketplace.mjs`.
Requiere `SUPABASE_SERVICE_ROLE_KEY` en el entorno del proceso, con la clave
secreta vigente de la API. Crea cuentas y publicaciones temporales en la
instancia configurada y las elimina al terminar. No ejecutarla contra otra
instancia sin revisar primero las variables de entorno.
