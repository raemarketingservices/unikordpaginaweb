import { useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { Eye, LogOut, Save, Trash2 } from "lucide-react";
import { getLocalData, isLocalAdmin, signInLocalAdmin, signOutLocalAdmin, updateLocalData } from "@/lib/local-db";
import type { Categoria, Producto, Servicio, Tienda } from "@/data/marketplace";

type Section = "inicio" | "usuarios" | "tiendas" | "productos" | "servicios" | "categorias" | "chatbot";
const sections: { id: Section; label: string }[] = [
  { id: "inicio", label: "Portada" }, { id: "usuarios", label: "Usuarios" }, { id: "tiendas", label: "Tiendas" },
  { id: "productos", label: "Productos" }, { id: "servicios", label: "Servicios" },
  { id: "categorias", label: "Categorías" }, { id: "chatbot", label: "Chatbot" },
];

export function LocalAdmin({ onAuthChange }: { onAuthChange: () => void }) {
  const router = useRouter();
  const [unlocked, setUnlocked] = useState(isLocalAdmin);
  const [password, setPassword] = useState("");
  const [section, setSection] = useState<Section>("usuarios");
  const [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const data = getLocalData();

  const refresh = async () => {
    setRevision((n) => n + 1);
    await router.invalidate();
  };
  void revision;
  const unlock = (event: React.FormEvent) => {
    event.preventDefault();
    if (!signInLocalAdmin(password)) { toast.error("Contraseña incorrecta."); return; }
    setUnlocked(true);
    setPassword("");
    onAuthChange();
  };
  if (!unlocked) return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <form onSubmit={unlock} className="card-uniko grid gap-4 p-7">
        <h1 className="text-xl font-bold">Acceso de administración</h1>
        <label className="grid gap-1 text-sm font-semibold">Contraseña
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password" required className="input-uniko" />
        </label>
        <button className="btn-base btn-brand" type="submit">Entrar al panel</button>
        <p className="text-xs text-muted-foreground">Modo local. Los datos se guardan solo en este navegador.</p>
      </form>
    </div>
  );

  const start = (kind: Section, row: Record<string, unknown>) => {
    setEditing(`${kind}:${String(row["id"] ?? row["slug"])}`);
    setDraft({ ...row });
  };
  const save = (kind: Section, id: string) => {
    updateLocalData((db) => {
      if (kind === "tiendas") {
        const item = db.stores.find((s) => s.id === id);
        if (item) Object.assign(item, draft);
        db.products.forEach((p) => { if (p.tiendaId === id) p.tienda = String(draft["nombre"] ?? p.tienda); });
      }
      if (kind === "productos") { const item = db.products.find((p) => p.id === id); if (item) Object.assign(item, draft); }
      if (kind === "servicios") { const item = db.services.find((s) => s.id === id); if (item) Object.assign(item, draft); }
      if (kind === "categorias") { const item = db.categories.find((c) => c.slug === id); if (item) Object.assign(item, draft); }
    });
    setEditing(null);
    void refresh();
    toast.success("Cambios guardados.");
  };
  const remove = (kind: Section, id: string) => {
    if (!window.confirm("¿Eliminar este elemento?")) return;
    updateLocalData((db) => {
      if (kind === "usuarios") {
        db.users = db.users.filter((u) => u.id !== id);
        const storeIds = db.stores.filter((s) => db.storeOwners[s.id] === id).map((s) => s.id);
        db.stores = db.stores.filter((s) => !storeIds.includes(s.id));
        db.products = db.products.filter((p) => !storeIds.includes(p.tiendaId ?? ""));
      }
      if (kind === "tiendas") {
        db.stores = db.stores.filter((s) => s.id !== id);
        db.products = db.products.filter((p) => p.tiendaId !== id);
      }
      if (kind === "productos") db.products = db.products.filter((p) => p.id !== id);
      if (kind === "servicios") db.services = db.services.filter((s) => s.id !== id);
      if (kind === "categorias") db.categories = db.categories.filter((c) => c.slug !== id);
    });
    void refresh();
    toast.success("Elemento eliminado.");
  };

  const list = section === "tiendas" ? data.stores : section === "productos" ? data.products :
    section === "servicios" ? data.services : section === "categorias" ? data.categories : [];
  const fields: Record<string, { key: string; label: string; type?: string }[]> = {
    tiendas: [{ key: "nombre", label: "Nombre" }, { key: "categoria", label: "Categoría" },
      { key: "ubicacion", label: "Ubicación" }, { key: "rnc", label: "RNC" },
      { key: "descripcion", label: "Descripción" }, { key: "logo", label: "URL del logo" }],
    productos: [{ key: "titulo", label: "Título" }, { key: "descripcion", label: "Descripción" },
      { key: "precio", label: "Precio", type: "number" }, { key: "categoria", label: "Categoría" },
      { key: "imagen", label: "URL de imagen" }],
    servicios: [{ key: "titulo", label: "Título" }, { key: "proveedor", label: "Proveedor" },
      { key: "desde", label: "Precio desde", type: "number" }, { key: "categoria", label: "Categoría" },
      { key: "imagen", label: "URL de imagen" }],
    categorias: [{ key: "nombre", label: "Nombre" }, { key: "icono", label: "Icono" },
      { key: "tipo", label: "Tipo" }],
  };
  const title = (row: Tienda | Producto | Servicio | Categoria) =>
    "nombre" in row ? row.nombre : "titulo" in row ? row.titulo : "";
  const rowId = (row: Tienda | Producto | Servicio | Categoria) => "id" in row ? row.id : row.slug;

  return <div className="mx-auto max-w-6xl px-4 py-9">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold">Panel de administración</h1>
        <p className="text-sm text-muted-foreground">Contenido local de UNIKO-RD</p></div>
      <div className="flex gap-2"><Link to="/" className="btn-base btn-outline"><Eye className="h-4 w-4" /> Ver sitio</Link>
        <button type="button" className="btn-base btn-outline" onClick={() => {
          signOutLocalAdmin(); setUnlocked(false); onAuthChange();
        }}><LogOut className="h-4 w-4" /> Salir</button></div>
    </div>
    <div className="mb-6 grid gap-2 sm:grid-cols-4">
      <div className="border-b border-border pb-2 text-sm">{data.users.length} usuarios</div>
      <div className="border-b border-border pb-2 text-sm">{data.stores.length} tiendas</div>
      <div className="border-b border-border pb-2 text-sm">{data.products.length} productos</div>
      <div className="border-b border-border pb-2 text-sm">{data.services.length} servicios</div>
    </div>
    <nav className="mb-6 flex flex-wrap gap-2 border-b border-border pb-3" aria-label="Secciones de administración">
      {sections.map((s) => <button key={s.id} type="button" onClick={() => { setSection(s.id); setEditing(null); }}
        className={`px-3 py-2 text-sm font-semibold ${section === s.id ? "border-b-2 border-brand text-brand" : "text-muted-foreground hover:text-foreground"}`}>{s.label}</button>)}
    </nav>
    {section === "inicio" && <form className="grid max-w-xl gap-4" onSubmit={(e) => {
      e.preventDefault(); updateLocalData((db) => { db.home = { ...db.home, ...draft }; });
      void refresh(); toast.success("Portada actualizada.");
    }}>
      <label className="grid gap-1 text-sm font-semibold">Título principal
        <input className="input-uniko" value={String(draft["headline"] ?? data.home.headline)} onChange={(e) => setDraft({ ...draft, headline: e.target.value })} required /></label>
      <label className="grid gap-1 text-sm font-semibold">Descripción
        <textarea className="input-uniko min-h-24" value={String(draft["subtitle"] ?? data.home.subtitle)} onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })} /></label>
      <button className="btn-base btn-brand" type="submit"><Save className="h-4 w-4" /> Guardar portada</button>
    </form>}
    {section === "usuarios" && <div className="divide-y divide-border">
      {data.users.length === 0 && <p className="py-6 text-sm text-muted-foreground">Todavía no hay usuarios registrados en este navegador.</p>}
      {data.users.map((u) => <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div><p className="font-semibold">{u.full_name}</p><p className="text-sm text-muted-foreground">{u.email} · {u.role === "vendor" ? "Vendedor" : "Usuario"} · {u.phone || "Sin teléfono"}</p></div>
        <button type="button" title="Eliminar usuario" className="btn-base btn-outline" onClick={() => remove("usuarios", u.id)}><Trash2 className="h-4 w-4" /></button>
      </div>)}</div>}
    {section !== "inicio" && section !== "usuarios" && section !== "chatbot" && <div className="divide-y divide-border">
      {list.map((row) => {
        const id = rowId(row); const active = editing === `${section}:${id}`;
        return <div key={id} className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="font-semibold">{title(row)}</p><p className="text-xs text-muted-foreground">{id}{"sku" in row && row.sku ? ` · SKU ${row.sku}` : ""}</p></div>
            <div className="flex gap-2"><button type="button" className="btn-base btn-outline" onClick={() => active ? setEditing(null) : start(section, row as unknown as Record<string, unknown>)}>{active ? "Cancelar" : "Editar"}</button>
              <button type="button" title="Eliminar" className="btn-base btn-outline" onClick={() => remove(section, id)}><Trash2 className="h-4 w-4" /></button></div>
          </div>
          {active && <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(fields[section] ?? []).map((field) => <label key={field.key} className="grid gap-1 text-xs font-semibold">{field.label}
              <input type={field.type ?? "text"} value={String(draft[field.key] ?? "")}
                onChange={(e) => setDraft({ ...draft, [field.key]: field.type === "number" ? Number(e.target.value) : e.target.value })}
                className="input-uniko" /></label>)}
            {(section === "tiendas" || section === "productos" || section === "servicios") &&
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(draft["verificado"])} onChange={(e) => setDraft({ ...draft, verificado: e.target.checked })} /> Verificado</label>}
            {(section === "tiendas" || section === "productos") &&
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(draft["destacado"])} onChange={(e) => setDraft({ ...draft, destacado: e.target.checked })} /> Destacado</label>}
            <button type="button" className="btn-base btn-brand sm:col-span-2" onClick={() => save(section, id)}><Save className="h-4 w-4" /> Guardar</button>
          </div>}
        </div>;
      })}</div>}
    {section === "chatbot" && <form onSubmit={(e) => {
      e.preventDefault(); updateLocalData((db) => { db.chatbot = { ...db.chatbot, ...draft, updated_at: new Date().toISOString() }; });
      void refresh(); toast.success("Chatbot actualizado.");
    }} className="grid max-w-xl gap-4">
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={Boolean(draft["enabled"] ?? data.chatbot.enabled)} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} /> Chatbot activo</label>
      <label className="grid gap-1 text-sm font-semibold">Saludo
        <textarea className="input-uniko min-h-24" value={String(draft["greeting"] ?? data.chatbot.greeting)} onChange={(e) => setDraft({ ...draft, greeting: e.target.value })} /></label>
      <p className="text-sm font-semibold">Tiendas que puede conocer</p>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={(draft["allowed_stores"] as string[] ?? data.chatbot.allowed_stores).includes("*")}
        onChange={(e) => setDraft({ ...draft, allowed_stores: e.target.checked ? ["*"] : [] })} /> Todas las tiendas</label>
      {data.stores.map((s) => <label key={s.id} className="flex gap-2 text-sm"><input type="checkbox"
        checked={(draft["allowed_stores"] as string[] ?? data.chatbot.allowed_stores).includes("*") || (draft["allowed_stores"] as string[] ?? data.chatbot.allowed_stores).includes(s.id)}
        onChange={(e) => { const current = (draft["allowed_stores"] as string[] ?? data.chatbot.allowed_stores).filter((id) => id !== "*");
          setDraft({ ...draft, allowed_stores: e.target.checked ? [...current, s.id] : current.filter((id) => id !== s.id) }); }} /> {s.nombre}</label>)}
      <button type="submit" className="btn-base btn-brand"><Save className="h-4 w-4" /> Guardar chatbot</button>
    </form>}
  </div>;
}
