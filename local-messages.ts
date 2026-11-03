import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import type { Plugin } from 'vite';

type Message = { id: string; store: string; buyer: string; sender: string; name: string; text: string; date: string };
// ponytail: persistence for one localhost process; use a database before running multiple servers.
export function localMessages(): Plugin {
  const directory = new URL('./.local-data/', import.meta.url);
  const file = new URL('messages.json', directory);
  const base = 'https://uniko-marketplace.aqui-rd.workers.dev';
  const aliases = new URL('usernames.json', directory);
  const pending = new Set<string>();
  return { name: 'local-messages', configureServer(server) {
    server.middlewares.use('/local-api/auth', async (req, res) => {
      const reply = (status: number, data: unknown) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); };
      let reserved = '';
      try {
        if (req.method !== 'POST') return reply(405, { error: 'Método no permitido.' });
        let body = '';
        for await (const chunk of req) { body += chunk; if (body.length > 12000) return reply(413, { error: 'Solicitud demasiado larga.' }); }
        const input = JSON.parse(body);
        const username = typeof input.username === 'string' ? input.username.trim().toLowerCase() : '';
        const register = req.url?.split('?')[0] === '/register';
        const users: Record<string, string> = existsSync(aliases) ? JSON.parse(readFileSync(aliases, 'utf8')) : {};
        if (register) {
          if (!/^[a-z0-9_]{3,30}$/.test(username)) return reply(400, { error: 'Usuario: de 3 a 30 letras, números o guiones bajos.' });
          if (Object.hasOwn(users, username) || pending.has(username)) return reply(409, { error: 'Ese nombre de usuario ya está en uso.' });
          reserved = username;
          pending.add(username);
        }
        const email = register ? input.email : username.includes('@') ? username : Object.hasOwn(users, username) ? users[username] : '';
        if (!email) return reply(401, { error: 'Usuario o contraseña incorrectos. Si tu cuenta es anterior, usa tu correo.' });
        const response = await fetch(`${base}/api/auth/${register ? 'register' : 'login'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...input, email }) });
        const data = await response.json();
        if (response.ok && register) {
          const latest = existsSync(aliases) ? JSON.parse(readFileSync(aliases, 'utf8')) : {};
          mkdirSync(directory, { recursive: true });
          latest[username] = String(email).trim().toLowerCase();
          writeFileSync(new URL('usernames.tmp', directory), JSON.stringify(latest));
          renameSync(new URL('usernames.tmp', directory), aliases);
          const adminFile = new URL('admin.json', directory);
          const adminState = existsSync(adminFile) ? JSON.parse(readFileSync(adminFile, 'utf8')) : { edits: {}, deleted: {}, pending: [], profiles: [], settings: {} };
          adminState.profiles = [...adminState.profiles.filter((p: {id:string}) => p.id !== data.profile.id), data.profile];
          writeFileSync(new URL('admin.tmp', directory), JSON.stringify(adminState));
          renameSync(new URL('admin.tmp', directory), adminFile);
        }
        reply(response.status, data);
      } catch { reply(500, { error: 'No se pudo completar el acceso. Inténtalo de nuevo.' }); }
      finally { if (reserved) pending.delete(reserved); }
    });
    server.middlewares.use('/local-api/messages', async (req, res) => {
      const reply = (status: number, data: unknown) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); };
      try {
        if (!['GET', 'POST'].includes(req.method ?? '')) return reply(405, { error: 'Método no permitido.' });
        const authorization = req.headers.authorization;
        if (!authorization?.startsWith('Bearer ')) return reply(401, { error: 'Inicia sesión para contactar una tienda.' });
        const auth = await fetch(`${base}/api/auth/me`, { headers: { Authorization: authorization } });
        if (!auth.ok) return reply(401, { error: 'Tu sesión ha caducado.' });
        const { profile } = await auth.json() as { profile: { id: string; full_name: string } };
        const response = await fetch(`${base}/api/stores`);
        if (!response.ok) throw new Error('No se pudieron consultar las tiendas.');
        const stores = await response.json() as { id: string; owner_id: string }[];
        const messages: Message[] = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];
        if (req.method === 'GET') return reply(200, messages.filter(m => m.buyer === profile.id || stores.some(s => s.id === m.store && s.owner_id === profile.id)));
        let body = '';
        for await (const chunk of req) { body += chunk; if (body.length > 12000) return reply(413, { error: 'Mensaje demasiado largo.' }); }
        const input = JSON.parse(body);
        const store = stores.find(s => s.id === input.store);
        const content = typeof input.text === 'string' ? input.text.trim() : '';
        if (!store || !content || content.length > 2000) return reply(400, { error: 'Selecciona una tienda y escribe hasta 2,000 caracteres.' });
        const buyer = store.owner_id === profile.id ? input.buyer : profile.id;
        if (typeof buyer !== 'string' || (store.owner_id === profile.id && !messages.some(m => m.store === store.id && m.buyer === buyer))) return reply(403, { error: 'Conversación no disponible.' });
        const message = { id: crypto.randomUUID(), store: store.id, buyer, sender: profile.id, name: profile.full_name, text: content, date: new Date().toISOString() };
        mkdirSync(directory, { recursive: true });
        writeFileSync(new URL('messages.tmp', directory), JSON.stringify([...messages, message]));
        renameSync(new URL('messages.tmp', directory), file);
        reply(201, message);
      } catch (error) { reply(500, { error: error instanceof Error ? error.message : 'No se pudo guardar el mensaje.' }); }
    });
  } };
}
