import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Building2, CarFront, ImagePlus, Trash2, UserRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { slugUnico, subirArchivos, subirImagen } from "@/lib/queries";
import { provincias } from "@/data/marketplace";
import { SelectorUbicacion, type Punto } from "@/components/uniko/Mapa";
import {
  COMBUSTIBLES,
  ESLOGAN_AUTOS,
  EXTRAS,
  TIPOS_VEHICULO,
  dinero,
  fetchMiProveedor,
  fetchMisVehiculos,
  nombreVehiculo,
  type Proveedor,
  type Vehiculo,
} from "@/lib/vehiculos";

export const Route = createFileRoute("/vehiculos/publicar")({
  head: () => ({ meta: [{ title: "Pon tu vehículo a rentar · UNIKO-RD" }, { name: "robots", content: "noindex" }] }),
  component: Publicar,
});

function Publicar() {
  const { session, loading } = useAuth();
  const userId = session?.user.id ?? null;
  const [prov, setProv] = useState<Proveedor | null | undefined>(undefined);
  const [mios, setMios] = useState<Vehiculo[]>([]);

  const cargar = useCallback(async () => {
    if (!userId) return;
    const [p, v] = await Promise.all([fetchMiProveedor(userId), fetchMisVehiculos(userId)]);
    setProv(p);
    setMios(v);
  }, [userId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (loading) return <p className="p-8 text-center text-sm text-muted-foreground">Cargando…</p>;

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="card-uniko p-8">
          <CarFront className="mx-auto h-10 w-10 text-brand" />
          <h1 className="mt-4 text-xl">{ESLOGAN_AUTOS}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Inicia sesión o crea tu cuenta para poner vehículos a rentar como Rent-A-Car o particular.
          </p>
          <Link to="/auth" search={{ redirect: "/vehiculos/publicar" }} className="btn-base btn-brand mt-6 w-full">
            Iniciar sesión o crear cuenta
          </Link>
        </div>
      </div>
    );
  }

  if (prov === undefined) return <p className="p-8 text-center text-sm text-muted-foreground">Cargando tu perfil…</p>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {prov ? (
        <>
          <h1 className="text-2xl sm:text-3xl">Pon tu vehículo a rentar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Publicas como <strong>{prov.nombre}</strong> ({prov.tipo === "rentacar" ? "Rent-A-Car" : "particular"}).
            Sale en la web y la app al instante.
          </p>
          <FormVehiculo userId={session.user.id} onPublicado={cargar} />
          <MisVehiculos lista={mios} onCambio={cargar} />
        </>
      ) : (
        <RegistroProveedor userId={session.user.id} email={session.user.email ?? ""} onListo={cargar} />
      )}
    </div>
  );
}

function RegistroProveedor({ userId, email, onListo }: { userId: string; email: string; onListo: () => void }) {
  const [tipo, setTipo] = useState<"rentacar" | "particular">("rentacar");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [correo, setCorreo] = useState(email);
  const [provincia, setProvincia] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);

  const registrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telefono.trim() && !whatsapp.trim()) return void toast.error("Indica un teléfono o WhatsApp para que te contacten.");
    setEnviando(true);
    try {
      const logoUrl = logo ? await subirImagen(logo, userId) : null;
      const { error } = await supabase.from("vehicle_providers").insert({
        id: userId,
        tipo,
        nombre: nombre.trim(),
        telefono: telefono.trim() || null,
        whatsapp: whatsapp.trim() || null,
        email: correo.trim() || null,
        provincia: provincia || null,
        descripcion: descripcion.trim() || null,
        logo: logoUrl,
      });
      if (error) throw new Error(error.message);
      toast.success("¡Listo! Ya puedes publicar vehículos.");
      onListo();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo completar el registro.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <h1 className="text-2xl sm:text-3xl">Regístrate para rentar vehículos</h1>
      <p className="mt-1 text-sm text-muted-foreground">Un paso único; después publicas todos los vehículos que quieras.</p>
      <form onSubmit={registrar} className="card-uniko mt-6 grid gap-4 p-6">
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["rentacar", "Rent-A-Car", Building2],
              ["particular", "Particular (mi vehículo)", UserRound],
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
        <Campo label={tipo === "rentacar" ? "Nombre del Rent-A-Car" : "Tu nombre completo"}>
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
        <Campo label="Descripción y condiciones generales (opcional)">
          <textarea className="input-uniko min-h-20" maxLength={600} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </Campo>
        <button type="submit" disabled={enviando} className="btn-base btn-brand">
          {enviando ? "Registrando…" : "Registrarme y empezar a publicar"}
        </button>
      </form>
    </>
  );
}

function FormVehiculo({ userId, onPublicado }: { userId: string; onPublicado: () => void }) {
  const vacio = {
    marca: "",
    modelo: "",
    anio: "",
    color: "",
    tipo: "sedan" as keyof typeof TIPOS_VEHICULO,
    transmision: "automatica" as "automatica" | "manual",
    combustible: "gasolina" as keyof typeof COMBUSTIBLES,
    pasajeros: "5",
    puertas: "4",
    kilometraje: "",
    tarifa: "",
    moneda: "DOP" as "DOP" | "USD",
    deposito: "",
    provincia: "",
    descripcion: "",
  };
  const [f, setF] = useState(vacio);
  const [extras, setExtras] = useState<string[]>([]);
  const [fotos, setFotos] = useState<File[]>([]);
  const [punto, setPunto] = useState<Punto | null>(null);
  const [enviando, setEnviando] = useState(false);
  const set = (k: keyof typeof vacio) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((v) => ({ ...v, [k]: e.target.value }));
  const solo = (k: keyof typeof vacio) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((v) => ({ ...v, [k]: e.target.value.replace(/\D/g, "") }));
  const num = (v: string) => (v.trim() === "" ? null : Number(v));

  const publicar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fotos.length) return void toast.error("Sube al menos una foto del vehículo.");
    setEnviando(true);
    try {
      const urls = await subirArchivos(fotos, userId);
      const { error } = await supabase.from("vehicles").insert({
        id: slugUnico(`${f.marca} ${f.modelo} ${f.anio}`),
        provider_id: userId,
        marca: f.marca.trim(),
        modelo: f.modelo.trim(),
        anio: Number(f.anio),
        color: f.color.trim() || null,
        tipo: f.tipo,
        transmision: f.transmision,
        combustible: f.combustible,
        pasajeros: Number(f.pasajeros),
        puertas: num(f.puertas),
        kilometraje: num(f.kilometraje),
        tarifa_dia: Number(f.tarifa),
        moneda: f.moneda,
        deposito: num(f.deposito),
        provincia: f.provincia || null,
        descripcion: f.descripcion.trim() || null,
        fotos: urls,
        extras,
        lat: punto?.lat ?? null,
        lng: punto?.lng ?? null,
      });
      if (error) throw new Error(error.message);
      toast.success("¡Vehículo publicado!");
      setF(vacio);
      setFotos([]);
      setExtras([]);
      setPunto(null);
      onPublicado();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo publicar.");
    } finally {
      setEnviando(false);
    }
  };

  const anioMax = new Date().getFullYear() + 1;

  return (
    <form onSubmit={publicar} className="card-uniko mt-6 grid gap-4 p-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Campo label="Marca"><input className="input-uniko" required value={f.marca} onChange={set("marca")} placeholder="Toyota" /></Campo>
        <Campo label="Modelo"><input className="input-uniko" required value={f.modelo} onChange={set("modelo")} placeholder="Corolla" /></Campo>
        <Campo label="Año"><input className="input-uniko" required type="number" min={1950} max={anioMax} value={f.anio} onChange={set("anio")} placeholder="2022" /></Campo>
        <Campo label="Color"><input className="input-uniko" value={f.color} onChange={set("color")} placeholder="Blanco" /></Campo>
        <Campo label="Tipo">
          <select className="select-uniko" value={f.tipo} onChange={set("tipo")}>
            {Object.entries(TIPOS_VEHICULO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Campo>
        <Campo label="Transmisión">
          <select className="select-uniko" value={f.transmision} onChange={set("transmision")}>
            <option value="automatica">Automática</option>
            <option value="manual">Manual</option>
          </select>
        </Campo>
        <Campo label="Combustible">
          <select className="select-uniko" value={f.combustible} onChange={set("combustible")}>
            {Object.entries(COMBUSTIBLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Campo>
        <Campo label="Pasajeros"><input className="input-uniko" required type="number" min={1} max={60} value={f.pasajeros} onChange={set("pasajeros")} /></Campo>
        <Campo label="Puertas"><input className="input-uniko" type="number" min={0} max={10} value={f.puertas} onChange={set("puertas")} /></Campo>
        <Campo label="Kilometraje"><input className="input-uniko" inputMode="numeric" value={f.kilometraje} onChange={solo("kilometraje")} placeholder="45000" /></Campo>
        <Campo label="Tarifa por día"><input className="input-uniko" required inputMode="numeric" value={f.tarifa} onChange={solo("tarifa")} placeholder="3500" /></Campo>
        <Campo label="Moneda">
          <select className="select-uniko" value={f.moneda} onChange={set("moneda")}>
            <option value="DOP">Pesos (RD$)</option>
            <option value="USD">Dólares (US$)</option>
          </select>
        </Campo>
        <Campo label="Depósito (opcional)"><input className="input-uniko" inputMode="numeric" value={f.deposito} onChange={solo("deposito")} /></Campo>
        <Campo label="Provincia">
          <select className="select-uniko" required value={f.provincia} onChange={set("provincia")}>
            <option value="">Selecciona…</option>
            {provincias.map((p) => <option key={p}>{p}</option>)}
          </select>
        </Campo>
      </div>
      <Campo label="Detalles y condiciones (requisitos, edad mínima, combustible…)">
        <textarea className="input-uniko min-h-24" maxLength={3000} value={f.descripcion} onChange={set("descripcion")} />
      </Campo>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-xs font-bold uppercase tracking-wide text-primary">Incluye</legend>
        <div className="flex flex-wrap gap-2">
          {EXTRAS.map((x) => {
            const on = extras.includes(x);
            return (
              <button
                key={x}
                type="button"
                onClick={() => setExtras((v) => (on ? v.filter((y) => y !== x) : [...v, x]))}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${on ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
              >
                {x}
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
          <input type="file" multiple accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => setFotos([...(e.target.files ?? [])].slice(0, 10))} />
        </label>
        <span className="text-[11px] text-muted-foreground">
          La primera es la portada. Recomendado: horizontales, 1600 × 1200 px (4:3), exterior e interior.
        </span>
      </div>
      <div className="grid gap-1.5">
        <span className="text-xs font-bold uppercase tracking-wide text-primary">Lugar de recogida en el mapa (opcional)</span>
        <SelectorUbicacion value={punto} onChange={setPunto} />
      </div>
      <button type="submit" disabled={enviando} className="btn-base btn-brand">
        {enviando ? "Publicando…" : "Publicar vehículo"}
      </button>
    </form>
  );
}

function MisVehiculos({ lista, onCambio }: { lista: Vehiculo[]; onCambio: () => void }) {
  const borrar = async (v: Vehiculo) => {
    if (!window.confirm(`¿Eliminar «${nombreVehiculo(v)}»? No se puede deshacer.`)) return;
    const { error } = await supabase.from("vehicles").delete().eq("id", v.id);
    if (error) return void toast.error(error.message);
    toast.success("Vehículo eliminado.");
    onCambio();
  };
  if (!lista.length) return null;
  return (
    <section className="mt-8">
      <h2 className="text-xl">Mis vehículos ({lista.length})</h2>
      <ul className="mt-3 grid gap-2">
        {lista.map((v) => (
          <li key={v.id} className="card-uniko flex items-center gap-3 p-3">
            {v.fotos[0] && <img src={v.fotos[0]} alt="" className="h-14 w-20 rounded-lg object-cover" />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{nombreVehiculo(v)}</p>
              <p className="text-xs text-muted-foreground">
                {dinero(v.tarifa_dia, v.moneda)} / día{v.approved === false && " · Oculto por el administrador"}
              </p>
            </div>
            <Link to="/vehiculos/$vehiculoId" params={{ vehiculoId: v.id }} className="btn-base btn-outline">Ver</Link>
            <button type="button" onClick={() => void borrar(v)} aria-label={`Eliminar ${nombreVehiculo(v)}`} className="btn-base btn-outline text-destructive">
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
