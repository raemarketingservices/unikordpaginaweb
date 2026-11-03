import { Link, useRouter } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ArrowRight, ShoppingBag, Store, MessageCircle, Eye, EyeOff } from 'lucide-react';
import { Logo } from './Logo';
import { api, cloudLogin } from '@/lib/cloudflare';
import { useAuth } from '@/lib/auth';
import hero from '@/assets/hero-uniko.jpg';

export function Landing() {
  const router = useRouter();
  const [settings, setSettings] = useState<Record<string, string>>({});
  useEffect(() => { void api<Record<string, string>>("/api/app-settings").then(setSettings).catch(() => {}); }, []);
  const { profile, refreshLocal } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <div style={{ "--primary": settings["primary"] || "#0033a0", "--brand": settings["brand"] || "#cc0033" } as React.CSSProperties} className="min-h-[100svh] bg-[#f5f7fc] pb-[env(safe-area-inset-bottom)]">
    <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5"><Logo className="h-10" /><Link to="/auth" search={{ modo: 'crear' }} className="text-sm font-bold text-primary">Crear cuenta <ArrowRight className="inline h-4 w-4" /></Link></header>
    <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 pb-10 pt-4 lg:grid-cols-2 lg:gap-16 lg:py-14">
      <section><span className="rounded-full bg-primary/10 px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-primary">Tu marketplace dominicano</span><h1 className="mt-6 text-4xl leading-[1.12] tracking-tight sm:text-5xl">{settings["headline"] || <>Todo lo que buscas.<br /><span className="text-primary">Ahora en tu mano.</span></>}</h1><p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">{settings["subtitle"] || "Descubre productos, conecta con tiendas de tu comunidad y empieza a vender desde tu celular."}</p><div className="relative mt-6 overflow-hidden rounded-3xl"><img src={settings["banner"] || hero} alt="Comercios y emprendedores dominicanos" className="aspect-[4/3] w-full object-contain bg-white" /><span className="absolute bottom-3 left-3 rounded-xl bg-white/95 px-4 py-2 text-xs font-bold text-primary">{settings["bannerCaption"] || "Compra local. Encuentra más."}</span></div><div className="mt-5 grid grid-cols-3 gap-2">{[{ Icon: ShoppingBag, text: 'Explora productos' }, { Icon: MessageCircle, text: 'Habla con tiendas' }, { Icon: Store, text: 'Vende lo tuyo' }].map(({ Icon, text }) => <div className="rounded-2xl bg-white p-3 text-center" key={text}><Icon className="mx-auto mb-2 h-5 w-5 text-primary" /><p className="text-[11px] font-semibold">{text}</p></div>)}</div></section>
      <section className="rounded-3xl border border-white bg-white p-6 shadow-xl shadow-blue-950/5 sm:p-8"><p className="text-xs font-bold uppercase tracking-widest text-brand">Bienvenido a UNIKO-RD</p><h2 className="mt-2 text-2xl">{profile ? `Hola, ${profile.first_name || 'bienvenido'}` : 'Tu próximo hallazgo empieza aquí'}</h2><p className="mt-3 text-sm text-muted-foreground">Una cuenta para comprar, guardar favoritos y conectar con vendedores.</p>{profile ? <Link to="/productos" className="btn-base btn-brand mt-6 w-full">Entrar a la app <ArrowRight className="h-4 w-4" /></Link> : <form className="mt-6 grid gap-4" onSubmit={async e => { e.preventDefault(); if (busy) return; setBusy(true); setError(''); try { await cloudLogin(username.trim(), password); refreshLocal(); await router.navigate({ to: '/productos' }); } catch(e) { setError(e instanceof Error ? e.message : 'No pudimos iniciar sesión.'); } finally { setBusy(false); } }}><label className="grid gap-2 text-sm font-semibold">Nombre de usuario<input className="input-uniko min-h-12 text-base" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required value={username} onChange={e => setUsername(e.target.value)} placeholder="Tu usuario o correo" /></label><label className="grid gap-2 text-sm font-semibold">Contraseña<div className="relative"><input className="input-uniko min-h-12 w-full pr-12 text-base" name="password" autoComplete="current-password" required type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Escribe tu contraseña" /><button type="button" aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute right-0 top-0 grid h-12 w-12 place-items-center" onClick={() => setShow(!show)}>{show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div></label>{error && <p role="alert" className="text-sm text-red-600">{error}</p>}<Link to="/auth" search={{ modo: 'crear' }} className="btn-base btn-brand min-h-12 w-full">Crear cuenta</Link><button disabled={busy} className="btn-base btn-brand min-h-12 w-full">{busy ? 'Entrando…' : 'Entrar a la app'}<ArrowRight className="h-4 w-4" /></button></form>}<div className="mt-6 border-t pt-5 text-center"><Link to="/productos" className="text-sm font-semibold text-primary">Explorar productos sin iniciar sesión →</Link></div></section>
    </div><p className="px-5 pb-6 text-center text-xs text-muted-foreground">UNIKO-RD · Conectando personas y negocios en República Dominicana</p><div className="pb-6 text-center"><Link to="/admin" className="text-xs font-semibold text-primary">Administración</Link></div>
  </div>;
}


