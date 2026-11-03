import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { timingSafeEqual, createHash } from 'node:crypto';
import type { Plugin } from 'vite';

type Row = Record<string, any>;
type State = { edits: Record<string, Record<string, Row>>; deleted: Record<string, string[]>; pending: string[]; profiles: Row[]; settings: Row };
// ponytail: local overlays retain the existing catalog; migrate to the production database before deploying.
export function localAdmin(): Plugin {
  const dir = new URL('./.local-data/', import.meta.url), file = new URL('admin.json', dir);
  const sessions = new Map<string, number>(), attempts = new Map<string, { count: number; until: number }>();
  const load = (): State => existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { edits: {}, deleted: {}, pending: [], profiles: [], settings: {} };
  const save = (state: State) => { mkdirSync(dir, { recursive: true }); writeFileSync(new URL('admin.tmp', dir), JSON.stringify(state)); renameSync(new URL('admin.tmp', dir), file); };
  const profile = { id: '__local_admin__', role: 'admin', full_name: 'Administrador', email: 'admin@localhost' };
  const merge = (state: State, resource: string, rows: Row[]) => rows.filter(r => !state.deleted[resource]?.includes(r['id'])).map(r => ({ ...r, ...state.edits[resource]?.[r['id']] }));
  return { name: 'local-admin', configureServer(server) {
    server.middlewares.use('/local-api/marketplace', async (req, res) => {
      const reply = (status: number, data: unknown) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); };
      try {
        const path = new URL(req.url ?? '/', 'http://localhost').pathname;
        const token = req.headers.authorization?.replace(/^Bearer /, '') ?? '';
        const admin = (sessions.get(token) ?? 0) > Date.now();
        let raw = '';
        for await (const chunk of req) { raw += chunk; if(raw.length > 2_000_000) return reply(413, {error:'Solicitud demasiado grande.'}); }
        const input = raw ? JSON.parse(raw) : {};
        if (path === '/api/auth/admin' && req.method === 'POST') {
          const address = req.socket.remoteAddress ?? 'local';
          let attempt = attempts.get(address);
          if (!attempt || attempt.until < Date.now()) { attempt = {count:0, until:Date.now()+900000}; attempts.set(address, attempt); }
          if (attempt.count >= 10) return reply(429,{error:'Intenta de nuevo en 15 minutos.'});
          const hash = (s: string) => createHash('sha256').update(s).digest();
          const expected = process.env['UNIKO_ADMIN_PASSWORD'];
          if (!expected) return reply(503, {error:'Define UNIKO_ADMIN_PASSWORD para usar el panel local.'});
          if (typeof input.password !== 'string' || !timingSafeEqual(hash(input.password), hash(expected))) { attempt.count++; return reply(401,{error:'Contraseña incorrecta.'}); }
          attempts.delete(address);
          const session = crypto.randomUUID(); sessions.set(session, Date.now()+8*3600000);
          return reply(200,{token:session,profile});
        }
        if (admin && path === '/api/auth/me') return reply(200,{profile});
        if (admin && path === '/api/auth/logout') {sessions.delete(token); return reply(200,{ok:true});}
        const state = load();
        if (path === '/api/app-settings' && req.method === 'GET') return reply(200,state.settings);
        if (path.startsWith('/api/admin/')) {
          if (!admin) return reply(403,{error:'Acceso denegado.'});
          const [, , , resource, id] = path.split('/');
          if (!resource || !['stores','products','services','categories','profiles','page_blocks','chatbot_settings','app-settings'].includes(resource)) return reply(404,{error:'Recurso desconocido.'});
          if (resource === 'app-settings') {
            if (req.method === 'GET') return reply(200,state.settings);
            if (req.method !== 'PATCH') return reply(405,{error:'Método no permitido.'});
            for (const [key,value] of Object.entries(input)) {
              if (!['headline','subtitle','banner','bannerCaption','primary','brand'].includes(key) || typeof value !== 'string' || value.length > 2000) return reply(400,{error:'Configuración inválida.'});
              if (['primary','brand'].includes(key) && !/^#[0-9a-f]{6}$/i.test(value)) return reply(400,{error:'Color inválido.'});
              if (key === 'banner' && value && !/^https?:\/\//.test(value) && !/^\/(?!\/)/.test(value)) return reply(400,{error:'Usa una URL de imagen válida.'});
            }
            state.settings = {...state.settings,...input}; save(state); return reply(200,{ok:true});
          }
          if (req.method === 'GET') {
            if(resource === 'profiles') return reply(200,state.profiles);
            const endpoint = resource.replace('_','-');
            const response = await fetch(`https://uniko-marketplace.aqui-rd.workers.dev/api/${endpoint === 'chatbot-settings' ? 'chatbot' : endpoint}`);
            if(!response.ok) return reply(response.status,{error:'No se pudo cargar el catálogo.'});
            const rows = await response.json(); return reply(200,merge(state,resource,Array.isArray(rows)?rows:[rows]));
          }
          if(!id) return reply(400,{error:'Falta ID.'});
          if(req.method === 'PATCH') {
            const allowed = resource === 'stores' ? ['name','description','category','location','rnc','logo','cover','verified','featured','approved'] : resource === 'profiles' ? ['first_name','last_name','full_name','phone','avatar_url'] : ['title','description','sku','category','price','compare_at_price','image','gallery','videos','location','shipping','verified','featured','best_seller','is_new','name','icon','tipo','position','price_from','provider','coverage','recommended','enabled','greeting','allowed_stores','config','subtitle'];
            if(Object.keys(input).some(k=>!allowed.includes(k))) return reply(400,{error:'Campo no permitido.'});
            state.edits[resource] ??= {}; state.edits[resource][id] = {...state.edits[resource][id],...input};
            if (input.approved === true) state.pending = state.pending.filter(s=>s!==id);
            save(state); return reply(200,{ok:true});
          }
          if(req.method === 'DELETE') {state.deleted[resource] ??= []; state.deleted[resource].push(id); save(state); return reply(200,{ok:true});}
          return reply(405,{error:'Método no permitido.'});
        }
        if (path === '/api/products' && req.method === 'POST') {
          if(state.pending.includes(input.store_id) || state.edits['stores']?.[input.store_id]?.['approved'] === false) return reply(403,{error:'Tu tienda está pendiente de aprobación del administrador.'});
        }
        const headers: Record<string,string> = {'Content-Type':'application/json'};
        if(token && !admin) headers['Authorization'] = `Bearer ${token}`;
        if (path === '/api/purchase-requests' && req.method === 'POST') {
          if (!token || admin) return reply(401,{error:'Inicia sesión con una cuenta de comprador para comprar.'});
          const me = await fetch('https://uniko-marketplace.aqui-rd.workers.dev/api/auth/me',{headers});
          if(!me.ok) return reply(401,{error:'Inicia sesión para continuar con tu compra.'});
        }
        const response = await fetch(`https://uniko-marketplace.aqui-rd.workers.dev${req.url}`, {method:req.method ?? 'GET',headers,...(raw?{body:raw}:{})});
        let data = await response.json();
        if(response.ok && path === '/api/stores' && req.method === 'POST') {
          const id = data.id ?? data.store?.id;
          if (id) {const current=load(); current.pending.push(id); current.edits['stores'] ??= {}; current.edits['stores'][id]={approved:false}; save(current);}
        }
        const resource = path.slice('/api/'.length);
        if(response.ok && req.method === 'GET' && Array.isArray(data)) {
          data = merge(state,resource,data);
          let owner = '';
          if (token && !admin && resource === 'stores') {
            const me = await fetch('https://uniko-marketplace.aqui-rd.workers.dev/api/auth/me', {headers});
            if(me.ok) owner = (await me.json()).profile?.id ?? '';
          }
          if(['stores','products'].includes(resource) && !admin) data = data.filter((r:Row)=>resource==='stores' ? (owner && r['owner_id'] === owner) || (!state.pending.includes(r['id']) && r['approved'] !== false) : !state.pending.includes(r['store_id']) && state.edits['stores']?.[r['store_id']]?.['approved'] !== false && !state.deleted['stores']?.includes(r['store_id']));
        }
        reply(response.status,data);
      } catch {reply(500,{error:'No se pudo completar la operación.'});}
    });
  }};
}

