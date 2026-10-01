# UNIKO-RD — contexto completo (web)

## 0. Repos (clonar ambas)

| Repo | Clonación | Contenido |
|---|---|---|
| **Web (este repo)** | `git clone https://github.com/raemarketingservices/unikordpaginaweb.git` | TanStack Start + Vite + Tailwind v4 + Supabase JS |
| **App Android** | `git clone https://github.com/raemarketingservices/Uniko-RD-App.git` | Kotlin + Jetpack Compose + Room + OkHttp |

- Ambas viven en GitHub bajo la organización `raemarketingservices`; remoto `origin` = la URL de arriba.
- Este repo además tiene un remoto `lovable` (`https://github.com/escalantebenancio-eng/uniko-rd-marketplace.git`) sincronizado con [Lovable](https://lovable.dev) → **nunca reescribir historia** (ver §9).
- Directorios de trabajo actuales: web en `unikord/uniko-rd-marketplace`, app en `unikord/Uniko-RD-App`.

## 1. Qué es esto
Marketplace dominicano multi-vendor (productos + servicios) con **dos repos** (links en §0). Nada de esto corre en local contra datos reales: **la BD real es la del VPS** (§4).

## 2. Comandos (web)
- `npm run dev` → **puerto 5050** (`strictPort: true` en `vite.config.ts`). Verificar: `curl http://localhost:5050/ordenes` → 200.
- `npx tsc --noEmit` → 0 errores.
- `npm run lint` → **0 errores, ~52 warnings preexistentes** (no "arreglar" warnings viejos).
- Build de producción: **siempre** `$env:NITRO_PRESET='node-server'; npm run build`
  (en PowerShell la forma `NITRO_PRESET=node-server npm run build` NO existe).
  El preset por defecto `cloudflare-module` se cuelga >15 min. Salida: `.output/server/index.mjs`.
- `npm run format` (Prettier). Regla: **usar el tool de edición, nunca `Set-Content`** (§9).

## 3. Mapa del repo web
- `src/routes/` — rutas file-based: `index`, `ordenes`, `cuenta`, `vender`, `checkout`, `carrito`, `admin.tsx`, `auth.tsx`, `productos.*`, `tiendas.*`, `servicios.*`, `buscar`, `ofertas`, `favoritos`, `mensajes`, `legal.$doc`.
- `src/routes/api/` — endpoints server: `whatsapp.avisar.tsx` (POST) y `whatsapp.webhook.tsx` (GET verificación Meta + POST mensajes entrantes). Se definen con `createFileRoute(...){server:{handlers:{GET,POST}}}` (soportado por TanStack Start, ya verificado).
- `src/components/admin/` — paneles (referencia de estilo: `GestionTiendas.tsx`).
- `src/components/vendedor/PanelOrdenes.tsx` — panel del vendedor (tiendas, filtros por estado, tabla desktop + tarjetas móvil, modal `ui/dialog`, cambio de `status` + aviso WhatsApp).
- `src/components/ui/` — primitivas shadcn (dialog, alert-dialog, table, select, dropdown…).
- `src/lib/supabase.ts` — único cliente; `VITE_SUPABASE_URL` (default `https://uniko-rd.com`) y `VITE_SUPABASE_PUBLISHABLE_KEY`.
- `src/lib/auth.tsx` — `AuthProvider`/`useAuth` (`session`, `profile`, `isAdmin`).
- `src/styles.css` — tokens y utilidades del design system.
- `supabase/` — `schema.sql`, `migration_v2..v8.sql`, `seed.sql`, **`OPERACION.md` (LEER PRIMERO)**.
- `scripts/` — `verify-marketplace.mjs` (test de integración), `vps-ssh.py`, `vps-upload.py`.
- `Dockerfile` (multi-stage, `NITRO_PRESET=node-server`, Node 22, corre en :3000) y `docker-compose.yml` (contenedor `uniko-web`, publicado en el host **:8090**, etiquetas Traefik para `uniko-rd.com`).

## 4. Supabase self-hosted (VPS `84.46.254.137`)
- URL pública `https://uniko-rd.com` (mismo origen que la web → sin CORS ni contenido mixto).
  Endpoints: `/rest/v1`, `/auth/v1`, `/storage/v1`, `/functions/v1`, `/realtime/v1` los sirve `supabase-envoy`.
- Key publishable en cliente: `sb_publishable_qDTaqHyWWdy92o7G6InGDJ_WEugr_zv`.
- Contenedores: `supabase-db` (user `supabase_admin`, db `postgres`), `supabase-auth`, `supabase-envoy`, `supabase-kong`, etc.
- **Aplicar SQL** (el `-f` dentro del contenedor NO ve `/tmp` del host; hay que usar stdin):
  `Get-Content supabase\migration_vN.sql -Raw | python scripts\vps-ssh.py "cat > /tmp/m.sql && docker exec -i supabase-db psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -f - < /tmp/m.sql"`
- Migraciones `v2..v8` **ya aplicadas**. `migration_v8.sql` es clave:
  - `purchase_requests.store_ids text[]` + índice GIN.
  - RLS: select/update de vendedor si `store_ids &&` sus tiendas (respaldo: `items[].tienda` = `stores.name`), update admin, **revocado UPDATE general → solo se puede actualizar la columna `status`**.
  - RPC `public.tienda_contactos(nombres text[])` (security definer, grant a `anon` y `authenticated`) → devuelve teléfonos de vendedores (los perfiles de otros usuarios NO son legibles por RLS).
- `stores.id` es **text**; `profiles` solo es legible por el propio usuario/admin.
- Verificación sin sesión: simular JWT en SQL (no hay credenciales de vendedor reales para probar en UI).
- Test de integración: `node --env-file=.env.local scripts/verify-marketplace.mjs` (requiere `SUPABASE_SERVICE_ROLE_KEY`, crea datos temporales y los borra). **Ojo**: los tests de WhatsApp envían mensajes REALES.

## 5. VPS + Coolify (deploy)
- VPS `84.46.254.137`, password en la env `VPS_PASS`, helper `python scripts\vps-ssh.py "comando"`.
  **Riesgo de ban**: tras varios intentos de SSH el host puede filtrar 22/443 manteniendo el ping OK (fail2ban/CSF). Si pasa, esperar y reintentar; no insistir.
- **Coolify** hace deploy automático en cada `git push a main`: webhook de GitHub → reconstruye con el `Dockerfile` → redespliega el recurso `unikord-web` (proyecto `unikord` / environment `production`), sirve `https://uniko-rd.com` y `www`.
- Rollback manual: el stack `/opt/uniko-rd` (`docker compose up -d --build`).
- **Variables de entorno cifradas**: Coolify guarda los valores con `APP_KEY` de Laravel en formato `Crypt::encrypt()` (serialize=true).
  Para insertar/leer desde la DB de Coolify (`coolify-db`, user/db `coolify`, tabla `environment_variables`): usar **`$e->encrypt($valor)`** de Laravel; `Crypt::encryptString()` da `DecryptError` y el valor en croto da `DecryptException`.
- Ruteo Traefik: `uniko-web` (todo el tráfico del dominio) y `supabase-envoy` (API) **deben** llevar `traefik.docker.network=coolify`, si no, Traefik elige la IP de la otra red → 504 a los 30 s.
- Despliegue manual alternativo (documentado en `supabase/OPERACION.md`): build con `VITE_SUPABASE_URL=https://uniko-rd.com`, `tar` de `.output`, `scripts/vps-upload.py`.

## 6. WhatsApp / Meta Cloud API
- Número `+1 849-627-9994` (negocio "Aqui RD"), **conectado pero SIN plantillas aprobadas** → solo se puede escribir dentro de la ventana de 24 h.
- Env vars `META_WA_PHONE_NUMBER_ID`, `META_WA_TOKEN`, `META_WA_VERIFY_TOKEN` viven **en Coolify**, no en el repo; el server las lee como `process.env["META_WA_*"]` (por `noPropertyAccessFromIndexSignature`).
- `POST /api/whatsapp/avisar`: `{role:'buyer'|'seller', nombre, telefono, total, tiendas?|estado?}` → JSON `{ok,enviados,motivo}`. `buyer` resuelve teléfonos con `tienda_contactos`; `seller` avisa al comprador.
- `GET /api/whatsapp/webhook` verifica con `hub.challenge`; `POST` responde automáticamente (hola/precio/orden/estado) en la ventana de 24 h.
- Teléfonos DR (10 dígitos) se normalizan con prefijo `1`.

## 7. Design system (obligatorio al tocar UI)
- Botones: **siempre** `btn-base` + variante `btn-brand | btn-primary | btn-outline | btn-ghost-light` (+ `w-full`; `btn-sm` NO existe).
- Contenedores: `card-uniko`. Inputs: `input-uniko`, selects: `select-uniko` (o pill tipo `rounded-full border px-3 py-1 text-xs font-bold uppercase` con color de estado).
- Eyebrows: `text-xs font-bold uppercase tracking-wide text-primary` con icono lucide (`h-4 w-4` / `h-3.5 w-3.5`).
- Tablas: patrón de `GestionTiendas.tsx` — `overflow-x-auto` > `table w-full min-w-[…] text-left text-sm`, thead `border-b … text-xs uppercase text-muted-foreground`, filas `border-b border-border/60 hover:bg-muted/40`, celdas `px-4 py-3`.
- Modales: `@/components/ui/dialog` / `alert-dialog`. Colores: `--brand` (rojo), `--primary` (azul), `--success`, `--destructive`; usar `bg-primary/10 text-primary` para pills.
- Todo en español (incluye textos, `aria-label` y toasts).

## 8. App Android (`../Uniko-RD-App`)
- `data/Remoto.kt` → cliente HTTP directo a Supabase (`BASE = "https://uniko-rd.com"`, misma publishable key): auth (`signup`, `token`, `recover`), `stores`, `products`, y `POST /rest/v1/purchase_requests` (`enviarSolicitud`).
- `data/` → Room (`AppDatabase`, `Daos`, `Entities`: `ProductEntity.storeId/storeName`), `UnikoRepository.kt` (sync BD local ↔ Supabase), `Sesion.kt`.
- `ui/UnikoViewModel.kt` → estado global; `enviarSolicitudCompra(...)` arma el JSON del checkout y **ya envía `store_ids`** (array de `storeId` distintos del carrito) para que el vendedor vea las compras hechas desde la app.
- `ui/screens/*` → Home, Products, ProductDetail, Stores, StoreProfile, Services, ServiceDetail, Checkout, PublishProduct, Auth, Admin, LegalDoc; `ui/theme/*` colores/typo.
- Build: `.\gradlew.bat compileDebugKotlin` (JDK 21 Adoptium, SDK en `local.properties` → `%LOCALAPPDATA%\Android\Sdk`). APK release en `C:\Users\Admin\Desktop\UNIKO-RD.apk`.
- No hay tests unitarios útiles (`test/` y `androidTest/` vacíos por defecto).

## 9. Reglas de entorno (leer antes de ejecutar nada)
- **Shell = Windows PowerShell 5.1**: NO existe `&&`/`||`, no hay `head`/`tail`/`timeout`/heredoc `<<`, `$PID` es read-only. Encadenar con `;` y `if ($?)`.
- **Nunca editar código con `Set-Content`/`Out-File`**: sin `-Encoding UTF8` produce mojibake (ya se rompieron dos archivos así). Usar el editor/escritura de herramientas y `Get-Content -Encoding UTF8` para leer.
- Scripts largos/complejos → guardarlos en `.sh`/`.ps1` y ejecutarlos, no incrustarlos con comillas anidadas.
- **No reescribir historia de git** (el repo está conectado a Lovable): sin force-push, rebase ni amend de commits ya publicados. Commits en `main` sin acentos en el mensaje, estilo `feat:`/`style:`/`docs:`.
- `git push origin main` = deploy a producción. Confirmar antes de pushear.
- Secretos nunca en el repo: `.env.local` está gitignored (`*.local`), los `META_WA_*` viven en Coolify.
- Después de cada cambio: `npx tsc --noEmit` → `npm run lint` → `npm run build` (preset `node-server`) → `curl localhost:5050/<ruta>` → push → verificar deploy (si el VPS responde).
- Documentación existente: **`supabase/OPERACION.md`** (BD, VPS, Coolify, WhatsApp, pruebas) y `README.md` (brief original + secciones "Despliegue" y "Ordenes y WhatsApp").

## 10. Estado conocido (punto de partida)
- Web `main` = `d3ec07f` (panel de órdenes restyled con el design system) y app `main` = `e595be4` (`store_ids` en el checkout), ambos subidos.
- El VPS puede estar filtrando nuestra IP en TCP (ping OK, 22/443 sin respuesta): si `https://uniko-rd.com` no responde, es eso y no un bug del código; local el SSR de `/` y `/vender` se colgará ~50 s por eso.
- No hay credenciales de vendedor para probar la UI autenticada; la validación RLS se hace por SQL.
