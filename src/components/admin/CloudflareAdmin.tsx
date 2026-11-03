import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Bot, Home, Lock, LogOut, Package, Store, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cloudLogin } from "@/lib/cloudflare";
import { GestionUsuarios } from "./GestionUsuarios";
import { GestionTiendas } from "./GestionTiendas";
import { GestionProductos } from "./GestionProductos";
import { GestionServicios } from "./GestionServicios";
import { ConfigChatbot } from "./ConfigChatbot";
import { AppEditor } from './AppEditor';

const tabs = [
  { id: "inicio", label: "Portada", icon: Home }, { id: "usuarios", label: "Usuarios", icon: Users },
  { id: "tiendas", label: "Tiendas", icon: Store }, { id: "productos", label: "Productos", icon: Package },
  { id: "servicios", label: "Servicios", icon: Package },
  { id: "chatbot", label: "Chatbot", icon: Bot },
  { id: "categorias", label: "Categorías", icon: Package },
] as const;

export function CloudflareAdmin() {
  const { profile, session, isAdmin, refreshLocal, salir } = useAuth();
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("inicio");
  const [busy, setBusy] = useState(false);
  const [closing, setClosing] = useState(false);
  const logout = async () => {
    setClosing(true);
    try { await salir(); setTab('inicio'); toast.success('Sesión cerrada'); }
    catch { toast.error('La sesión local se cerró; no se pudo confirmar con el servidor.'); }
    finally { setClosing(false); }
  };
  const login = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true);
    try { await cloudLogin("", password, true); refreshLocal(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Acceso denegado."); }
    finally { setBusy(false); setPassword(""); }
  };
  if (!session) return <form onSubmit={login} className="card-uniko mx-auto my-16 grid max-w-sm gap-4 p-7">
    <h1 className="flex items-center gap-2 text-xl font-bold"><Lock className="h-5 w-5" /> Panel de administración</h1>
    <label className="grid gap-1 text-sm font-semibold">Contraseña
      <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input-uniko" />
    </label>
    <button disabled={busy} className="btn-base btn-brand">{busy ? "Entrando…" : "Entrar"}</button>
  </form>;
  if (!isAdmin) return <section className="mx-auto max-w-md px-4 py-16 text-center">
    <h1 className="text-xl font-bold">Acceso denegado</h1><p className="mt-2 text-sm text-muted-foreground">Esta cuenta no tiene permisos de administrador.</p>
    <button className="btn-base btn-outline mt-4" onClick={() => void salir()}>Cerrar sesión</button>
  </section>;
  return <main className="mx-auto w-full max-w-6xl px-4 py-9">
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold">Panel de administración</h1><p className="text-sm text-muted-foreground">{profile?.email}</p></div>
      <div className="flex flex-wrap gap-2"><Link to="/" className="btn-base btn-outline">Ver sitio</Link><button type="button" disabled={closing} className="btn-base btn-brand min-h-11" onClick={() => void logout()}><LogOut className="h-4 w-4" />{closing ? 'Cerrando…' : 'Cerrar sesión'}</button></div>
    </header>
    <nav className="mb-5 flex flex-wrap gap-2 border-b border-border pb-3" aria-label="Administración">
      {tabs.map(({ id, label, icon: TabIcon }) => <button key={id} className={`inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-semibold ${tab === id ? "border-brand text-brand" : "border-transparent text-muted-foreground"}`} onClick={() => setTab(id)}><TabIcon className="h-4 w-4" />{label}</button>)}
    </nav>
    <section key={tab} className="uniko-enter" aria-label={tabs.find((item) => item.id === tab)?.label}>
      {tab === "usuarios" && <GestionUsuarios />}
      {tab === "tiendas" && <AppEditor resource="stores" />}
      {tab === "productos" && <AppEditor resource="products" />}
      {tab === "servicios" && <AppEditor resource="services" />}
      {tab === "categorias" && <AppEditor resource="categories" />}
      {tab === "chatbot" && <ConfigChatbot />}
      {tab === "inicio" && <AppEditor />}
    </section>
  </main>;
}
