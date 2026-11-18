import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Building2, ImagePlus, Trash2, UserRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { slugUnico, subirArchivos, subirImagen } from "@/lib/queries";
import { provincias } from "@/data/marketplace";
import { SelectorUbicacion, type Punto } from "@/components/uniko/Mapa";
import {
  AMENIDADES,
  ESLOGAN,
  OPERACIONES,
  TIPOS,
  fetchMiAgente,
  fetchMisPropiedades,
  precioTexto,
  type Agente,
  type Propiedad,
} from "@/lib/propiedades";

export const Route = createFileRoute("/propiedades/publicar")({
  head: () => ({ meta: [{ title: "Publica tu propiedad · UNIKO-RD" }, { name: "robots", content: "noindex" }] }),
  component: Publicar,
});

function Publicar() {
  const { session, loading } = useAuth();
  const userId = session?.user.id ?? null;
  const [agente, setAgente] = useState<Agente | null | undefined>(undefined);
  const [mias, setMias] = useState<Propiedad[]>([]);

  const cargar = useCallback(async () => {
    if (!userId) return;
    const [a, p] = await Promise.all([fetchMiAgente(userId), fetchMisPropiedades(userId)]);
    setAgente(a);
    setMias(p);
  }, [userId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (loading) return <p className="p-8 text-center text-sm text-muted-foreground">Cargando…</p>;

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="card-uniko p-8">
          <Building2 className="mx-auto h-10 w-10 text-brand" />
          <h1 className="mt-4 text-xl">{ESLOGAN}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Inicia sesión o crea tu cuenta para publicar propiedades como inmobiliaria o agente.
          </p>
          <Link
            to="/auth"
            search={{ redirect: "/propiedades/publicar" }}
            className="btn-base btn-brand mt-6 w-full"
          >
            Iniciar sesión o crear cuenta
          </Link>
        </div>
      </div>
    );
  }

  if (agente === undefined)
    return <p className="p-8 text-center text-sm text-muted-foreground">Cargando tu perfil…</p>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {agente ? (
        <>
          <h1 className="text-2xl sm:text-3xl">Publica tu propiedad</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Publicas como <strong>{agente.nombre}</strong> (
            {agente.tipo === "inmobiliaria" ? "inmobiliaria" : "agente"}). Sale en la web y la app
            al instante.
          </p>
          <FormPropiedad userId={session.user.id} onPublicada={cargar} />
          <MisPropiedades lista={mias} onCambio={cargar} />
        </>
      ) : (
        <RegistroAgente userId={session.user.id} email={session.user.email ?? ""} onListo={cargar} />
      )}
    </div>
  );
}

function RegistroAgente({ userId, email, onListo }: { userId: string; email: string; onListo: () => void }) {
  const [tipo, setTipo] = useState<"inmobiliaria" | "agente">("inmobiliaria");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [correo, setCorreo] = useState(email);
  const [licencia, setLicencia] = useState("");
  const [provincia, setProvincia] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);

  const registrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telefono.trim() && !whatsapp.trim()) {
      toast.error("Indica un teléfono o WhatsApp para que te contacten.");
      return;
    }
    setEnviando(true);
    try {
      const logoUrl = logo ? await subirImagen(logo, userId) : null;
      const { error } = await supabase.from("property_agents").insert({
        id: userId,
        tipo,
        nombre: nombre.trim(),
        telefono: telefono.trim() || null,
        whatsapp: whatsapp.trim() || null,
        email: correo.trim() || null,
        licencia: licencia.trim() || null,
        provincia: provincia || null,
        descripcion: descripcion.trim() || null,
        logo: logoUrl,
      });
      if (error) throw new Error(error.message);
      toast.success("¡Listo! Ya puedes publicar propiedades.");
      onListo();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo completar el registro.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <h1 className="text-2xl sm:text-3xl">Regístrate como inmobiliaria o agente</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Un paso único: después podrás publicar todas las propiedades que quieras.
      </p>
      <form onSubmit={registrar} className="card-uniko mt-6 grid gap-4 p-6">
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["inmobiliaria", "Inmobiliaria", Building2],
              ["agente", "Agente independiente", UserRound],
            ] as const
          ).map(([valor, texto, Icono]) => (
            <button
              key={valor}
              type="button"
              onClick={() => setTipo(valor)}
              className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold ${
                tipo === valor ? "border-primary bg-primary/10 text-primary" : "border-border"
              }`}
            >
              <Icono className="h-4 w-4" /> {texto}
            </button>
          ))}
        </div>
        <Campo label={tipo === "inmobiliaria" ? "Nombre de la inmobiliaria" : "Tu nombre completo"}>
          <input className="input-uniko" required minLength={2} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Teléfono">
            <input className="input-uniko" inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="809-000-0000" />
          </Campo>
          <Campo label="WhatsApp">
            <input className="input-uniko" inputMode="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="829-000-0000" />
          </Campo>
          <Campo label="Correo de contacto">
            <input className="input-uniko" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} />
          </Campo>
          <Campo label="Licencia / registro (opcional)">
            <input className="input-uniko" value={licencia} onChange={(e) => setLicencia(e.target.value)} />
          </Campo>
          <Campo label="Provincia">
            <select className="select-uniko" value={provincia} onChange={(e) => setProvincia(e.target.value)}>
              <option value="">Selecciona…</option>
              {provincias.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Campo>
          <Campo label="Logo o foto (opcional)">
            <input className="input-uniko" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} />
          </Campo>
        </div>
        <Campo label="Descripción (opcional)">
          <textarea className="input-uniko min-h-20" maxLength={600} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </Campo>
        <button type="submit" disabled={enviando} className="btn-base btn-brand">
          {enviando ? "Registrando…" : "Registrarme y empezar a publicar"}
        </button>
      </form>
    </>
  );
}

function FormPropiedad({ userId, onPublicada }: { userId: string; onPublicada: () => void }) {
  const vacio = {
    titulo: "",
    operacion: "venta" as keyof typeof OPERACIONES,
    tipo: "casa" as keyof typeof TIPOS,
    precio: "",
    moneda: "DOP" as "DOP" | "USD",
    habitaciones: "",
    banos: "",
    parqueos: "",
    metros: "",
    provincia: "",
    sector: "",
    descripcion: "",
  };
  const [f, setF] = useState(vacio);
  const [amenidades, setAmenidades] = useState<string[]>([]);
  const [fotos, setFotos] = useState<File[]>([]);
  const [punto, setPunto] = useState<Punto | null>(null);
  const [enviando, setEnviando] = useState(false);
  const set = (k: keyof typeof vacio) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((v) => ({ ...v, [k]: e.target.value }));
  const num = (v: string) => (v.trim() === "" ? null : Number(v));

  const publicar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fotos.length) return void toast.error("Sube al menos una foto.");
    if (!punto) return void toast.error("Marca en el mapa la ubicación de la propiedad.");
    setEnviando(true);
    try {
      const urls = await subirArchivos(fotos, userId);
      const { error } = await supabase.from("properties").insert({
        id: slugUnico(f.titulo),
        agent_id: userId,
        titulo: f.titulo.trim(),
        operacion: f.operacion,
        tipo: f.tipo,
        precio: Number(f.precio),
        moneda: f.moneda,
        periodo: f.operacion === "venta" ? null : f.operacion === "alquiler_temporal" ? "noche" : "mes",
        habitaciones: num(f.habitaciones),
        banos: num(f.banos),
        parqueos: num(f.parqueos),
        metros: num(f.metros),
        provincia: f.provincia || null,
        sector: f.sector.trim() || null,
        descripcion: f.descripcion.trim() || null,
        fotos: urls,
        amenidades,
        lat: punto.lat,
        lng: punto.lng,
      });
      if (error) throw new Error(error.message);
      toast.success("¡Propiedad publicada!");
      setF(vacio);
      setFotos([]);
      setAmenidades([]);
      setPunto(null);
      onPublicada();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo publicar.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={publicar} className="card-uniko mt-6 grid gap-4 p-6">
      <Campo label="Título">
        <input className="input-uniko" required minLength={3} maxLength={120} value={f.titulo} onChange={set("titulo")} placeholder="Ej: Apartamento de 3 habitaciones en Piantini" />
      </Campo>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Operación">
          <select className="select-uniko" value={f.operacion} onChange={set("operacion")}>
            {Object.entries(OPERACIONES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Tipo de propiedad">
          <select className="select-uniko" value={f.tipo} onChange={set("tipo")}>
            {Object.entries(TIPOS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </Campo>
        <Campo label={f.operacion === "venta" ? "Precio" : f.operacion === "alquiler" ? "Precio por mes" : "Precio por noche"}>
          <input className="input-uniko" required inputMode="numeric" value={f.precio} onChange={(e) => setF((v) => ({ ...v, precio: e.target.value.replace(/\D/g, "") }))} />
        </Campo>
        <Campo label="Moneda">
          <select className="select-uniko" value={f.moneda} onChange={set("moneda")}>
            <option value="DOP">Pesos (RD$)</option>
            <option value="USD">Dólares (US$)</option>
          </select>
        </Campo>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Campo label="Habitaciones"><input className="input-uniko" type="number" min={0} value={f.habitaciones} onChange={set("habitaciones")} /></Campo>
        <Campo label="Baños"><input className="input-uniko" type="number" min={0} step={0.5} value={f.banos} onChange={set("banos")} /></Campo>
        <Campo label="Parqueos"><input className="input-uniko" type="number" min={0} value={f.parqueos} onChange={set("parqueos")} /></Campo>
        <Campo label="Metros²"><input className="input-uniko" type="number" min={0} value={f.metros} onChange={set("metros")} /></Campo>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Provincia">
          <select className="select-uniko" required value={f.provincia} onChange={set("provincia")}>
            <option value="">Selecciona…</option>
            {provincias.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Sector">
          <input className="input-uniko" value={f.sector} onChange={set("sector")} placeholder="Ej: Piantini" />
        </Campo>
      </div>
      <Campo label="Descripción">
        <textarea className="input-uniko min-h-28" maxLength={3000} value={f.descripcion} onChange={set("descripcion")} />
      </Campo>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-xs font-bold uppercase tracking-wide text-primary">Comodidades</legend>
        <div className="flex flex-wrap gap-2">
          {AMENIDADES.map((a) => {
            const on = amenidades.includes(a);
            return (
              <button
                key={a}
                type="button"
                onClick={() => setAmenidades((v) => (on ? v.filter((x) => x !== a) : [...v, a]))}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${on ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
              >
                {a}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="grid gap-1.5">
        <span className="text-xs font-bold uppercase tracking-wide text-primary">Fotos (hasta 10)</span>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border px-3 py-4 text-sm font-semibold text-muted-foreground hover:border-brand hover:text-brand">
          <ImagePlus className="h-5 w-5" />
          {fotos.length ? `${fotos.length} fotos seleccionadas` : "Elegir fotos (JPG, PNG o WebP)"}
          <input
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => setFotos([...(e.target.files ?? [])].slice(0, 10))}
          />
        </label>
        <span className="text-[11px] text-muted-foreground">
          La primera foto es la portada. Recomendado: horizontales, 1600 × 1200 px (4:3).
        </span>
      </div>
      <div className="grid gap-1.5">
        <span className="text-xs font-bold uppercase tracking-wide text-primary">Ubicación en el mapa</span>
        <SelectorUbicacion value={punto} onChange={setPunto} />
      </div>
      <button type="submit" disabled={enviando} className="btn-base btn-brand">
        {enviando ? "Publicando…" : "Publicar propiedad"}
      </button>
    </form>
  );
}

function MisPropiedades({ lista, onCambio }: { lista: Propiedad[]; onCambio: () => void }) {
  const borrar = async (p: Propiedad) => {
    if (!window.confirm(`¿Eliminar «${p.titulo}»? No se puede deshacer.`)) return;
    const { error } = await supabase.from("properties").delete().eq("id", p.id);
    if (error) return void toast.error(error.message);
    toast.success("Propiedad eliminada.");
    onCambio();
  };
  if (!lista.length) return null;
  return (
    <section className="mt-8">
      <h2 className="text-xl">Mis propiedades ({lista.length})</h2>
      <ul className="mt-3 grid gap-2">
        {lista.map((p) => (
          <li key={p.id} className="card-uniko flex items-center gap-3 p-3">
            {p.fotos[0] && <img src={p.fotos[0]} alt="" className="h-14 w-20 rounded-lg object-cover" />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{p.titulo}</p>
              <p className="text-xs text-muted-foreground">
                {precioTexto(p)} · {OPERACIONES[p.operacion]}
                {p.approved === false && " · Oculta por el administrador"}
              </p>
            </div>
            <Link to="/propiedades/$propiedadId" params={{ propiedadId: p.id }} className="btn-base btn-outline">
              Ver
            </Link>
            <button type="button" onClick={() => void borrar(p)} aria-label={`Eliminar ${p.titulo}`} className="btn-base btn-outline text-destructive">
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-bold uppercase tracking-wide text-primary">{label}</span>
      {children}
    </label>
  );
}
