interface Env {
  DB: D1Database;
  R2: R2Bucket;
  ADMIN_PASSWORD?: string;
}

type Identity = { id: string; role: string };
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS' };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
const bad = (message: string, status = 400) => json({ error: message }, status);

async function digest(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function passwordHash(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bytes = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 120_000, hash: 'SHA-256' }, key, 256);
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}

function token(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function identity(request: Request, env: Env): Promise<Identity | null> {
  const bearer = request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if (!bearer) return null;
  const row = await env.DB.prepare('SELECT user_id FROM auth_sessions WHERE token_hash = ? AND expires_at > ?')
    .bind(await digest(bearer), Date.now()).first<{ user_id: string }>();
  if (!row) return null;
  if (row.user_id === '__admin__') return { id: row.user_id, role: 'admin' };
  const profile = await env.DB.prepare('SELECT id, role FROM profiles WHERE id = ?').bind(row.user_id).first<Identity>();
  return profile ?? null;
}

async function session(env: Env, userId: string): Promise<string> {
  const value = token();
  await env.DB.prepare('INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(await digest(value), userId, Date.now() + 7 * 86400_000).run();
  return value;
}

async function throttled(request: Request, env: Env, route: string): Promise<boolean> {
  const key = `${route}:${request.headers.get('CF-Connecting-IP') ?? 'local'}`;
  const now = Date.now();
  const row = await env.DB.prepare('SELECT count, reset_at FROM auth_attempts WHERE client_key = ?').bind(key)
    .first<{ count: number; reset_at: number }>();
  if (row && row.reset_at > now && row.count >= 5) return true;
  await env.DB.prepare('INSERT INTO auth_attempts (client_key, count, reset_at) VALUES (?, 1, ?) ON CONFLICT(client_key) DO UPDATE SET count = CASE WHEN reset_at < ? THEN 1 ELSE count + 1 END, reset_at = CASE WHEN reset_at < ? THEN excluded.reset_at ELSE reset_at END')
    .bind(key, now + 900_000, now, now).run();
  return false;
}

function string(value: unknown, max = 600): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

async function body(request: Request): Promise<Record<string, unknown>> {
  if (Number(request.headers.get('Content-Length') ?? 0) > 16_000) throw new Error('Solicitud demasiado grande.');
  const value: unknown = await request.json();
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Datos inválidos.');
  return value as Record<string, unknown>;
}

const editable: Record<string, { table: string; fields: string[] }> = {
  stores: { table: 'stores', fields: ['name', 'rnc', 'description', 'category', 'location', 'verified', 'featured', 'logo', 'cover'] },
  products: { table: 'products', fields: ['title', 'description', 'category', 'price', 'compare_at_price', 'verified', 'featured', 'best_seller', 'is_new', 'location', 'shipping', 'image', 'gallery', 'videos'] },
  services: { table: 'services', fields: ['title', 'category', 'price_from', 'provider', 'verified', 'recommended', 'location', 'coverage', 'image'] },
  categories: { table: 'categories', fields: ['name', 'icon', 'tipo', 'position'] },
  page_blocks: { table: 'page_blocks', fields: ['title', 'subtitle', 'position', 'enabled', 'config'] },
  profiles: { table: 'profiles', fields: ['first_name', 'last_name', 'full_name', 'cedula', 'phone', 'role', 'avatar_url'] },
  chatbot_settings: { table: 'chatbot_settings', fields: ['enabled', 'greeting', 'allowed_stores'] },
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    if (request.method === 'OPTIONS') return new Response(null, { headers });

    try {
      if (path === '/health') return json({ ok: true });
      if (path.startsWith('/api/media/') && request.method === 'GET') {
        const object = await env.R2.get(path.slice('/api/media/'.length));
        if (!object) return bad('Archivo no encontrado.', 404);
        const responseHeaders = new Headers(headers);
        object.writeHttpMetadata(responseHeaders);
        responseHeaders.set('Cache-Control', 'public, max-age=86400');
        return new Response(object.body, { headers: responseHeaders });
      }

      if (request.method === 'GET' && ['/api/products', '/api/stores', '/api/categories', '/api/services', '/api/page-blocks'].includes(path)) {
        const table = path.slice('/api/'.length).replace('-', '_');
        const order = table === 'categories' || table === 'page_blocks' ? 'position ASC' : 'created_at DESC';
        const { results } = await env.DB.prepare(`SELECT * FROM ${table} ORDER BY ${order} LIMIT 500`).all();
        return json(results);
      }
      if (path === '/api/chatbot' && request.method === 'GET') {
        const cfg = await env.DB.prepare("SELECT * FROM chatbot_settings WHERE id = 'default'").first();
        return json(cfg);
      }

      if (path === '/api/auth/register' && request.method === 'POST') {
        if (await throttled(request, env, 'register')) return bad('Intenta de nuevo en 15 minutos.', 429);
        const input = await body(request);
        const email = string(input.email, 254).toLowerCase();
        const password = string(input.password, 128);
        const first = string(input.first_name, 100);
        const last = string(input.last_name, 100);
        if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8 || !first || !last) return bad('Correo, nombres, apellidos y contraseña de 8 caracteres son obligatorios.');
        const id = crypto.randomUUID();
        const salt = token();
        try {
          await env.DB.batch([
            env.DB.prepare('INSERT INTO profiles (id,email,full_name,first_name,last_name,cedula,phone,role) VALUES (?,?,?,?,?,?,?,?)')
              .bind(id, email, `${first} ${last}`, first, last, string(input.cedula, 30) || null, string(input.phone, 30) || null, input.role === 'vendor' ? 'vendor' : 'user'),
            env.DB.prepare('INSERT INTO auth_credentials (user_id,password_hash,salt) VALUES (?,?,?)').bind(id, await passwordHash(password, salt), salt),
          ]);
        } catch { return bad('No se pudo crear la cuenta; revisa si el correo ya existe.', 409); }
        return json({ token: await session(env, id), profile: await env.DB.prepare('SELECT * FROM profiles WHERE id = ?').bind(id).first() }, 201);
      }

      if ((path === '/api/auth/login' || path === '/api/auth/admin') && request.method === 'POST') {
        if (await throttled(request, env, path)) return bad('Intenta de nuevo en 15 minutos.', 429);
        const input = await body(request);
        if (path.endsWith('/admin')) {
          if (!env.ADMIN_PASSWORD || input.password !== env.ADMIN_PASSWORD) return bad('Credenciales incorrectas.', 401);
          return json({ token: await session(env, '__admin__'), profile: { id: '__admin__', role: 'admin', email: 'admin@uniko.com' } });
        }
        const email = string(input.email, 254).toLowerCase();
        const row = await env.DB.prepare('SELECT p.*, c.password_hash, c.salt FROM profiles p JOIN auth_credentials c ON c.user_id = p.id WHERE p.email = ?')
          .bind(email).first<Record<string, unknown>>();
        if (!row || row.password_hash !== await passwordHash(string(input.password, 128), String(row.salt))) return bad('Credenciales incorrectas.', 401);
        const { password_hash: _hash, salt: _salt, ...profile } = row;
        return json({ token: await session(env, String(row.id)), profile });
      }

      if (path === '/api/auth/me' && request.method === 'GET') {
        const user = await identity(request, env);
        if (!user) return bad('Sesión no válida.', 401);
        if (user.role === 'admin') return json({ profile: { id: user.id, role: 'admin', email: 'admin@uniko.com' } });
        return json({ profile: await env.DB.prepare('SELECT * FROM profiles WHERE id = ?').bind(user.id).first() });
      }
      if (path === '/api/profile' && request.method === 'PATCH') {
        if (!user || user.role === 'admin') return bad('Inicia sesión como usuario.', 401);
        const input = await body(request);
        const first = string(input.first_name, 100), last = string(input.last_name, 100);
        if (!first || !last) return bad('Nombres y apellidos son obligatorios.');
        await env.DB.prepare('UPDATE profiles SET first_name = ?, last_name = ?, full_name = ?, cedula = ?, phone = ?, avatar_url = ? WHERE id = ?')
          .bind(first, last, `${first} ${last}`, string(input.cedula, 30) || null, string(input.phone, 30) || null, string(input.avatar_url, 1000) || null, user.id).run();
        await env.DB.prepare('UPDATE stores SET owner_name = ? WHERE owner_id = ?').bind(`${first} ${last}`, user.id).run();
        return json({ ok: true });
      }
      if (path === '/api/auth/password' && request.method === 'POST') {
        if (!user || user.role === 'admin') return bad('Inicia sesión como usuario.', 401);
        const input = await body(request), password = string(input.password, 128);
        if (password.length < 8) return bad('La contraseña debe tener al menos 8 caracteres.');
        const salt = token();
        await env.DB.prepare('UPDATE auth_credentials SET password_hash = ?, salt = ? WHERE user_id = ?')
          .bind(await passwordHash(password, salt), salt, user.id).run();
        return json({ ok: true });
      }
      if (path === '/api/auth/logout' && request.method === 'POST') {
        const bearer = request.headers.get('Authorization')?.replace(/^Bearer /, '');
        if (bearer) await env.DB.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').bind(await digest(bearer)).run();
        return json({ ok: true });
      }

      const user = await identity(request, env);
      if (path === '/api/uploads' && request.method === 'POST') {
        if (!user) return bad('Inicia sesión.', 401);
        const type = request.headers.get('Content-Type') ?? '';
        const valid = /^(image\/(jpeg|png|webp|gif)|video\/(mp4|webm|quicktime))$/.test(type);
        const length = Number(request.headers.get('Content-Length') ?? 0);
        if (!valid || !length || length > (type.startsWith('video/') ? 50 : 10) * 1024 * 1024) return bad('Archivo no permitido o demasiado grande.');
        const key = `${user.id}/${crypto.randomUUID()}`;
        await env.R2.put(key, request.body, { httpMetadata: { contentType: type } });
        return json({ url: `${url.origin}/api/media/${key}` }, 201);
      }

      if (path === '/api/stores' && request.method === 'POST') {
        if (!user || !['vendor', 'admin'].includes(user.role)) return bad('Acceso denegado.', 403);
        const input = await body(request);
        const name = string(input.name, 80);
        if (name.length < 3) return bad('Nombre de tienda inválido.');
        const requestedId = string(input.id, 100).toLowerCase();
        const id = /^[a-z0-9-]{3,100}$/.test(requestedId) ? requestedId : crypto.randomUUID();
        const owner = user.role === 'admin' ? null : user.id;
        const ownerName = owner ? await env.DB.prepare('SELECT full_name FROM profiles WHERE id = ?').bind(owner).first<{ full_name: string }>() : null;
        await env.DB.prepare('INSERT INTO stores (id,owner_id,owner_name,name,rnc,description,category,location,logo,cover) VALUES (?,?,?,?,?,?,?,?,?,?)')
          .bind(id, owner, ownerName?.full_name ?? null, name, string(input.rnc, 30) || null, string(input.description) || null, string(input.category, 80) || null, string(input.location, 80) || null, string(input.logo, 1000) || null, string(input.cover, 1000) || null).run();
        return json({ id }, 201);
      }

      if (path === '/api/products' && request.method === 'POST') {
        if (!user) return bad('Inicia sesión.', 401);
        const input = await body(request);
        const storeId = string(input.store_id, 100);
        const store = await env.DB.prepare('SELECT owner_id FROM stores WHERE id = ?').bind(storeId).first<{ owner_id: string }>();
        if (!store || (user.role !== 'admin' && store.owner_id !== user.id)) return bad('Esa tienda no te pertenece.', 403);
        const title = string(input.title, 120);
        const price = Number(input.price);
        if (!title || !Number.isFinite(price) || price < 0) return bad('Título o precio inválido.');
        const requestedId = string(input.id, 100).toLowerCase();
        const id = /^[a-z0-9-]{3,100}$/.test(requestedId) ? requestedId : crypto.randomUUID();
        const sku = `UNIK-${token().slice(0, 10).toUpperCase()}`;
        const gallery = Array.isArray(input.gallery) ? input.gallery.filter((v): v is string => typeof v === 'string').slice(0, 10) : [];
        const videos = Array.isArray(input.videos) ? input.videos.filter((v): v is string => typeof v === 'string').slice(0, 10) : [];
        await env.DB.batch([
          env.DB.prepare('INSERT INTO products (id,store_id,title,description,sku,category,price,compare_at_price,location,shipping,image,gallery,videos,is_new) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1)')
            .bind(id, storeId, title, string(input.description) || null, sku, string(input.category, 80) || null, price, input.compare_at_price == null ? null : Number(input.compare_at_price), string(input.location, 80) || null, input.shipping === false ? 0 : 1, gallery[0] ?? null, JSON.stringify(gallery), JSON.stringify(videos)),
          env.DB.prepare('UPDATE stores SET products_count = products_count + 1 WHERE id = ?').bind(storeId),
        ]);
        return json({ id, sku }, 201);
      }

      if (path === '/api/ratings' && request.method === 'POST') {
        if (!user || user.role === 'admin') return bad('Inicia sesión como usuario.', 401);
        const input = await body(request);
        const storeId = string(input.store_id, 100);
        const rating = Number(input.rating);
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) return bad('La calificación debe ser de 1 a 5.');
        await env.DB.prepare('INSERT INTO store_ratings (store_id,user_id,rating) VALUES (?,?,?) ON CONFLICT(store_id,user_id) DO UPDATE SET rating = excluded.rating, updated_at = CURRENT_TIMESTAMP').bind(storeId, user.id, rating).run();
        await env.DB.prepare('UPDATE stores SET rating = (SELECT AVG(rating) FROM store_ratings WHERE store_id = ?), reviews = (SELECT COUNT(*) FROM store_ratings WHERE store_id = ?) WHERE id = ?').bind(storeId, storeId, storeId).run();
        return json({ ok: true });
      }
      if (path === '/api/ratings' && request.method === 'GET') {
        if (!user) return bad('Inicia sesión.', 401);
        const row = await env.DB.prepare('SELECT rating FROM store_ratings WHERE store_id = ? AND user_id = ?').bind(url.searchParams.get('store_id'), user.id).first();
        return json(row);
      }

      if (path.startsWith('/api/admin/')) {
        if (user?.role !== 'admin') return bad('Acceso denegado.', 403);
        const [, , , resource, id] = path.split('/');
        const config = editable[resource ?? ''];
        if (!config) return bad('Recurso desconocido.', 404);
        if (request.method === 'GET' && !id) {
          const { results } = await env.DB.prepare(`SELECT * FROM ${config.table} LIMIT 500`).all();
          return json(results);
        }
        if (!id) return bad('Falta ID.');
        if (request.method === 'PATCH') {
          const input = await body(request);
          const fields = config.fields.filter((field) => Object.hasOwn(input, field));
          if (!fields.length) return bad('No hay cambios.');
          const values = fields.map((field) => ['gallery', 'videos', 'config', 'allowed_stores'].includes(field) ? JSON.stringify(input[field]) : input[field]);
          await env.DB.prepare(`UPDATE ${config.table} SET ${fields.map((field) => `${field} = ?`).join(', ')} WHERE id = ?`).bind(...values, id).run();
          return json({ ok: true });
        }
        if (request.method === 'DELETE' && resource !== 'chatbot_settings') {
          if (resource === 'stores') await env.DB.batch([
            env.DB.prepare('DELETE FROM products WHERE store_id = ?').bind(id),
            env.DB.prepare('DELETE FROM services WHERE store_id = ?').bind(id),
            env.DB.prepare('DELETE FROM store_ratings WHERE store_id = ?').bind(id),
            env.DB.prepare('DELETE FROM stores WHERE id = ?').bind(id),
          ]);
          else if (resource === 'products') await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id).run();
          else if (resource === 'profiles') {
            const owned = await env.DB.prepare('SELECT id FROM stores WHERE owner_id = ?').bind(id).all<{ id: string }>();
            const statements = (owned.results ?? []).flatMap((store) => [
              env.DB.prepare('DELETE FROM products WHERE store_id = ?').bind(store.id),
              env.DB.prepare('DELETE FROM services WHERE store_id = ?').bind(store.id),
              env.DB.prepare('DELETE FROM store_ratings WHERE store_id = ?').bind(store.id),
              env.DB.prepare('DELETE FROM stores WHERE id = ?').bind(store.id),
            ]);
            statements.push(env.DB.prepare('DELETE FROM services WHERE owner_id = ?').bind(id));
            statements.push(env.DB.prepare('DELETE FROM auth_sessions WHERE user_id = ?').bind(id));
            statements.push(env.DB.prepare('DELETE FROM profiles WHERE id = ?').bind(id));
            await env.DB.batch(statements);
            return json({ ok: true });
          }
          else await env.DB.prepare(`DELETE FROM ${config.table} WHERE id = ?`).bind(id).run();
          return json({ ok: true });
        }
      }

      if (path === '/api/purchase-requests' && request.method === 'POST') {
        const input = await body(request);
        const fullName = string(input.full_name, 150), phone = string(input.phone, 30), email = string(input.email, 254);
        if (!fullName || !phone || !/^\S+@\S+\.\S+$/.test(email)) return bad('Datos de contacto inválidos.');
        await env.DB.prepare('INSERT INTO purchase_requests (id,user_id,full_name,address,phone,email,cedula,note,items,total,store_ids) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
          .bind(crypto.randomUUID(), user?.role === 'admin' ? null : user?.id ?? null, fullName, string(input.address, 300), phone, email, string(input.cedula, 30) || null, string(input.note, 1000) || null, JSON.stringify(input.items ?? []), Number(input.total) || 0, JSON.stringify(input.store_ids ?? [])).run();
        return json({ ok: true }, 201);
      }

      if (path === '/api/orders' && request.method === 'GET') {
        if (!user) return bad('Inicia sesión.', 401);
        const { results } = await env.DB.prepare('SELECT * FROM purchase_requests ORDER BY created_at DESC LIMIT 250').all<Record<string, unknown>>();
        let visible = results ?? [];
        if (user.role !== 'admin') {
          const stores = await env.DB.prepare('SELECT id FROM stores WHERE owner_id = ?').bind(user.id).all<{ id: string }>();
          const ids = new Set((stores.results ?? []).map((store) => store.id));
          visible = visible.filter((order) => {
            try { return (JSON.parse(String(order.store_ids ?? '[]')) as string[]).some((id) => ids.has(id)); }
            catch { return false; }
          });
        }
        return json(visible);
      }
      if (path.startsWith('/api/orders/') && request.method === 'PATCH') {
        if (!user) return bad('Inicia sesión.', 401);
        const id = path.slice('/api/orders/'.length), input = await body(request), status = string(input.status, 20);
        if (!['pendiente', 'confirmada', 'enviada', 'completada', 'cancelada'].includes(status)) return bad('Estado inválido.');
        const order = await env.DB.prepare('SELECT store_ids FROM purchase_requests WHERE id = ?').bind(id).first<{ store_ids: string }>();
        if (!order) return bad('Orden no encontrada.', 404);
        if (user.role !== 'admin') {
          const stores = await env.DB.prepare('SELECT id FROM stores WHERE owner_id = ?').bind(user.id).all<{ id: string }>();
          const own = new Set((stores.results ?? []).map((store) => store.id));
          let linked: string[] = [];
          try { linked = JSON.parse(order.store_ids ?? '[]') as string[]; } catch { /* Invalid legacy JSON is not editable. */ }
          if (!linked.some((storeId) => own.has(storeId))) return bad('No puedes modificar esta orden.', 403);
        }
        await env.DB.prepare('UPDATE purchase_requests SET status = ? WHERE id = ?').bind(status, id).run();
        return json({ ok: true });
      }
      // Professional Services
      if (path === '/api/professional-services' && request.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM professional_services ORDER BY created_at DESC LIMIT 500').all();
        return json(results);
      }
      if (path === '/api/professional-services' && request.method === 'POST') {
        if (!user) return bad('Inicia sesión.', 401);
        const input = await body(request);
        const name = string(input.name, 120), serviceType = string(input.service_type, 80);
        if (!name || !serviceType) return bad('Nombre y tipo de servicio son obligatorios.');
        const id = crypto.randomUUID();
        await env.DB.prepare('INSERT INTO professional_services (id,user_id,service_type,name,description,phone,whatsapp,lat,lng,province,municipality,image) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
          .bind(id, user.id, serviceType, name, string(input.description) || null, string(input.phone, 30) || null, string(input.whatsapp, 30) || null, Number(input.lat) || null, Number(input.lng) || null, string(input.province, 80) || null, string(input.municipality, 80) || null, string(input.image, 1000) || null).run();
        return json({ id }, 201);
      }

      // Store Dashboard - Orders
      if (path.match(/^\/api\/stores\/[^/]+\/orders$/) && request.method === 'GET') {
        if (!user) return bad('Inicia sesión.', 401);
        const storeId = path.split('/')[3];
        const store = await env.DB.prepare('SELECT owner_id FROM stores WHERE id = ?').bind(storeId).first<{ owner_id: string }>();
        if (!store || (user.role !== 'admin' && store.owner_id !== user.id)) return bad('No tienes acceso a esta tienda.', 403);
        const { results } = await env.DB.prepare('SELECT * FROM orders WHERE store_id = ? ORDER BY created_at DESC LIMIT 250').bind(storeId).all();
        return json(results);
      }

      // Store Dashboard - Messages
      if (path.match(/^\/api\/stores\/[^/]+\/messages$/) && request.method === 'GET') {
        if (!user) return bad('Inicia sesión.', 401);
        const storeId = path.split('/')[3];
        const store = await env.DB.prepare('SELECT owner_id FROM stores WHERE id = ?').bind(storeId).first<{ owner_id: string }>();
        if (!store || (user.role !== 'admin' && store.owner_id !== user.id)) return bad('No tienes acceso a esta tienda.', 403);
        const { results } = await env.DB.prepare('SELECT * FROM chat_messages WHERE store_id = ? AND read = 0 ORDER BY created_at DESC LIMIT 100').bind(storeId).all();
        return json(results);
      }

      // Chat - Send message
      if (path === '/api/chat/send' && request.method === 'POST') {
        const input = await body(request);
        const storeId = string(input.store_id, 100), message = string(input.message, 2000);
        if (!storeId || !message) return bad('Tienda y mensaje son obligatorios.');
        const id = crypto.randomUUID();
        const customerId = user?.id ?? 'guest';
        const customerName = user ? await env.DB.prepare('SELECT full_name FROM profiles WHERE id = ?').bind(user.id).first<{ full_name: string }>().then(r => r?.full_name || 'Cliente') : string(input.customer_name, 100) || 'Cliente';
        await env.DB.prepare('INSERT INTO chat_messages (id,store_id,customer_id,customer_name,message,sender,read) VALUES (?,?,?,?,?,?,0)')
          .bind(id, storeId, customerId, customerName, message, 'customer').run();
        return json({ id }, 201);
      }

      // Orders - Create
      if (path === '/api/orders' && request.method === 'POST') {
        const input = await body(request);
        const storeId = string(input.store_id, 100), productId = string(input.product_id, 100);
        const quantity = Number(input.quantity), total = Number(input.total);
        if (!storeId || !productId || !quantity || !total) return bad('Datos de pedido inválidos.');
        const id = crypto.randomUUID();
        const customerId = user?.id ?? 'guest';
        const customerName = user ? await env.DB.prepare('SELECT full_name FROM profiles WHERE id = ?').bind(user.id).first<{ full_name: string }>().then(r => r?.full_name || '') : string(input.customer_name, 100);
        await env.DB.prepare('INSERT INTO orders (id,store_id,customer_id,product_id,quantity,total,status,customer_name,customer_phone,delivery_address) VALUES (?,?,?,?,?,?,?,?,?,?)')
          .bind(id, storeId, customerId, productId, quantity, total, 'pending', customerName, string(input.customer_phone, 30) || null, string(input.delivery_address, 300) || null).run();
        return json({ id }, 201);
      }

      // Orders - Update status
      if (path.match(/^\/api\/orders\/[^/]+$/) && request.method === 'PATCH') {
        if (!user) return bad('Inicia sesión.', 401);
        const orderId = path.split('/')[3];
        const input = await body(request);
        const status = string(input.status, 20);
        if (!['pending', 'processing', 'shipped', 'completed', 'cancelled'].includes(status)) return bad('Estado inválido.');
        const order = await env.DB.prepare('SELECT store_id FROM orders WHERE id = ?').bind(orderId).first<{ store_id: string }>();
        if (!order) return bad('Pedido no encontrado.', 404);
        if (user.role !== 'admin') {
          const store = await env.DB.prepare('SELECT owner_id FROM stores WHERE id = ?').bind(order.store_id).first<{ owner_id: string }>();
          if (!store || store.owner_id !== user.id) return bad('No puedes modificar este pedido.', 403);
        }
        await env.DB.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(status, orderId).run();
        return json({ ok: true });
      }

      // Update store with location data
      if (path.match(/^\/api\/stores\/[^/]+$/) && request.method === 'PATCH') {
        if (!user) return bad('Inicia sesión.', 401);
        const storeId = path.split('/')[3];
        const store = await env.DB.prepare('SELECT owner_id FROM stores WHERE id = ?').bind(storeId).first<{ owner_id: string }>();
        if (!store || (user.role !== 'admin' && store.owner_id !== user.id)) return bad('No tienes acceso a esta tienda.', 403);
        const input = await body(request);
        const updates: string[] = [];
        const values: (string | number | null)[] = [];
        if (input.whatsapp !== undefined) { updates.push('whatsapp = ?'); values.push(string(input.whatsapp, 30) || null); }
        if (input.lat !== undefined) { updates.push('lat = ?'); values.push(Number(input.lat) || null); }
        if (input.lng !== undefined) { updates.push('lng = ?'); values.push(Number(input.lng) || null); }
        if (input.province !== undefined) { updates.push('province = ?'); values.push(string(input.province, 80) || null); }
        if (input.municipality !== undefined) { updates.push('municipality = ?'); values.push(string(input.municipality, 80) || null); }
        if (input.map_location !== undefined) { updates.push('map_location = ?'); values.push(string(input.map_location, 500) || null); }
        if (input.logo !== undefined) { updates.push('logo = ?'); values.push(string(input.logo, 1000) || null); }
        if (input.cover !== undefined) { updates.push('cover = ?'); values.push(string(input.cover, 1000) || null); }
        if (!updates.length) return bad('No hay cambios.');
        values.push(storeId);
        await env.DB.prepare(`UPDATE stores SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();
        return json({ ok: true });
      }

      return bad('No encontrado.', 404);
    } catch (error) {
      console.error(error);
      return bad('No pudimos completar la solicitud.', 500);
    }
  },
} satisfies ExportedHandler<Env>;
