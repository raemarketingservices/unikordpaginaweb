import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  BadgePercent,
  Copy,
  ExternalLink,
  MousePointerClick,
  Package,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { fetchProductos, slugUnico } from "@/lib/queries";
import { formatearRD, type Producto } from "@/data/marketplace";
import { Checkbox } from "@/components/ui/checkbox";
import { VitrinaVista } from "@/components/afiliados/VitrinaVista";
import { TablaComisiones } from "@/components/afiliados/TablaComisiones";
import {
  PROGRAMA,
  TEMA_BASE,
  VERSION_TERMINOS,
  calcularMetricas,
  enlaceAfiliado,
  enlaceVitrina,
  fetchMiAfiliado,
  type Afiliado,
  type Comision,
  type ProductoVitrina,
  type Tema,
} from "@/lib/afiliados";

export const Route = createFileRoute("/afiliados/panel")({
  loader: async () => ({ catalogo: await fetchProductos() }),
  head: () => ({ meta: [{ title: `Mi panel · ${PROGRAMA} · UNIKO-RD` }, { name: "robots", content: "noindex" }] }),
  component: Panel,
});

type Pestana = "resumen" | "productos" | "vitrina" | "comisiones";

function Panel() {
  const { session, profile, loading } = useAuth();
  const userId = session?.user.id ?? null;
  const [afiliado, setAfiliado] = useState<Afiliado | null | undefined>(undefined);

  const cargarAfiliado = useCallback(async () => {
    if (userId) setAfiliado(await fetchMiAfiliado(userId));
  }, [userId]);
  useEffect(() => {
    void cargarAfiliado();
  }, [cargarAfiliado]);

  if (loading) return <p className="p-8 text-center text-sm text-muted-foreground">Cargando…</p>;
  if (!session)
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="card-uniko p-8">
          <BadgePercent className="mx-auto h-10 w-10 text-brand" />
          <h1 className="mt-4 text-xl">{PROGRAMA}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Inicia sesión o crea tu cuenta para unirte al programa.</p>
          <Link to="/auth" search={{ redirect: "/afiliados/panel" }} className="btn-base btn-brand mt-6 w-full">
            Iniciar sesión o crear cuenta
          </Link>
        </div>
      </div>
    );
  if (afiliado === undefined) return <p className="p-8 text-center text-sm text-muted-foreground">Cargando tu perfil…</p>;
  if (!afiliado)
    return (
      <Registro
        userId={session.user.id}
        nombreInicial={profile?.first_name ?? ""}
        apellidoInicial={profile?.last_name ?? ""}
        telefonoInicial={profile?.phone ?? ""}
        onListo={cargarAfiliado}
      />
    );
  return <Dashboard afiliado={afiliado} onCambio={cargarAfiliado} />;
}

function Registro(props: {
  userId: string;
  nombreInicial: string;
  apellidoInicial: string;
  telefonoInicial: string;
  onListo: () => void;
}) {
  const [nombre, setNombre] = useState(props.nombreInicial);
  const [apellido, setApellido] = useState(props.apellidoInicial);
  const [telefono, setTelefono] = useState(props.telefonoInicial);
  const [pago, setPago] = useState("");
  const [acepta, setAcepta] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const registrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nombre.trim().length < 2 || apellido.trim().length < 2) return void toast.error("Escribe tu nombre y apellido.");
    if (!acepta) return void toast.error("Debes aceptar las guías y la política de Uniko Afiliados.");
    setEnviando(true);
    const { error } = await supabase.from("affiliates").insert({
      id: props.userId,
      slug: slugUnico(`${nombre} ${apellido}`),
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      telefono: telefono.trim() || null,
      metodo_pago: pago.trim() || null,
      terms_accepted_at: new Date().toISOString(),
      terms_version: VERSION_TERMINOS,
      theme: TEMA_BASE,
    });
    setEnviando(false);
    if (error) return void toast.error(error.message);
    toast.success(`¡Bienvenido a ${PROGRAMA}!`);
    props.onListo();
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl sm:text-3xl">Únete a {PROGRAMA}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tu nombre y apellido forman parte de tus enlaces y aparecen en tu vitrina.
      </p>
      <form onSubmit={registrar} className="card-uniko mt-6 grid gap-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Nombre *">
            <input className="input-uniko" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </Campo>
          <Campo label="Apellido *">
            <input className="input-uniko" required value={apellido} onChange={(e) => setApellido(e.target.value)} />
          </Campo>
        </div>
        <Campo label="Teléfono / WhatsApp">
          <input className="input-uniko" inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        </Campo>
        <Campo label="¿Cómo quieres cobrar? (banco y cuenta, o tPago)">
          <input className="input-uniko" value={pago} onChange={(e) => setPago(e.target.value)} placeholder="Ej: Banreservas, cuenta de ahorros 0000…" />
        </Campo>
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border p-4">
          <Checkbox checked={acepta} onCheckedChange={(v) => setAcepta(v === true)} className="mt-0.5 shrink-0" />
          <span className="text-xs leading-relaxed text-muted-foreground">
            He leído y acepto las{" "}
            <Link to="/afiliados/terminos" target="_blank" className="font-semibold text-brand underline">
              Guías del programa y la Política de privacidad de {PROGRAMA}
            </Link>{" "}
            (comisiones, uso de marca y promoción permitida).
          </span>
        </label>
        <button type="submit" disabled={enviando} className="btn-base btn-brand">
          {enviando ? "Registrando…" : "Crear mi cuenta de afiliado"}
        </button>
      </form>
    </div>
  );
}

function Dashboard({ afiliado, onCambio }: { afiliado: Afiliado; onCambio: () => void }) {
  const { catalogo } = Route.useLoaderData();
  const [pestana, setPestana] = useState<Pestana>("resumen");
  const [mios, setMios] = useState<{ product_id: string; position: number }[]>([]);
  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [clics, setClics] = useState(0);

  const cargar = useCallback(async () => {
    const [p, c, k] = await Promise.all([
      supabase.from("affiliate_products").select("product_id, position").eq("affiliate_id", afiliado.id).order("position"),
      supabase.from("affiliate_commissions").select("*").eq("affiliate_id", afiliado.id).order("created_at", { ascending: false }),
      supabase.from("affiliate_clicks").select("id", { count: "exact", head: true }).eq("affiliate_id", afiliado.id),
    ]);
    setMios((p.data as { product_id: string; position: number }[]) ?? []);
    setComisiones((c.data as Comision[]) ?? []);
    setClics(k.count ?? 0);
  }, [afiliado.id]);

  // Tiempo real: cada clic y cada venta atribuida se refleja sin recargar.
  useEffect(() => {
    void cargar();
    const filtro = `affiliate_id=eq.${afiliado.id}`;
    const canal = supabase
      .channel(`uniko-afiliado-${afiliado.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "affiliate_commissions", filter: filtro }, (e) => {
        if (e.eventType === "INSERT") toast.success("¡Nueva venta con tu enlace! 🎉");
        void cargar();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "affiliate_clicks", filter: filtro }, () =>
        setClics((n) => n + 1),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [afiliado.id, cargar]);

  const porId = useMemo(() => new Map(catalogo.map((p) => [p.id, p])), [catalogo]);
  const misProductos = mios.map((m) => porId.get(m.product_id)).filter(Boolean) as Producto[];
  const m = calcularMetricas(clics, comisiones);

  const pestanas: [Pestana, string][] = [
    ["resumen", "Resumen"],
    ["productos", `Productos (${misProductos.length})`],
    ["vitrina", "Mi vitrina"],
    ["comisiones", `Comisiones (${comisiones.length})`],
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-primary">{PROGRAMA}</p>
          <h1 className="text-2xl sm:text-3xl">
            Hola, {afiliado.nombre} {afiliado.apellido}
          </h1>
          <p className="text-sm text-muted-foreground">
            Comisión: <strong>{afiliado.commission_rate}%</strong> por venta ·{" "}
            {afiliado.status === "activo" ? "Cuenta activa" : "Cuenta pausada por el administrador"}
          </p>
        </div>
        <a href={enlaceVitrina(afiliado.slug)} target="_blank" rel="noreferrer" className="btn-base btn-outline">
          <ExternalLink className="h-4 w-4" /> Ver mi vitrina
        </a>
      </div>
      {afiliado.status === "pausado" && (
        <p role="status" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Tu cuenta está pausada: tus enlaces no registran clics ni comisiones hasta que el administrador la reactive.
        </p>
      )}

      <nav className="mt-6 flex flex-wrap gap-2 border-b border-border pb-4">
        {pestanas.map(([id, texto]) => (
          <button
            key={id}
            type="button"
            onClick={() => setPestana(id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              pestana === id ? "bg-primary text-primary-foreground" : "border border-border hover:bg-accent"
            }`}
          >
            {texto}
          </button>
        ))}
      </nav>

      {pestana === "resumen" && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metrica icono={MousePointerClick} titulo="Clics" valor={m.clics.toLocaleString("es-DO")} />
          <Metrica icono={ShoppingBag} titulo="Conversiones" valor={`${m.conversiones}`} nota={m.clics ? `${((m.conversiones / m.clics) * 100).toFixed(1)}% de los clics` : undefined} />
          <Metrica icono={Package} titulo="Productos vendidos" valor={`${m.unidades}`} />
          <Metrica icono={TrendingUp} titulo="Ventas generadas" valor={formatearRD(m.ingresos)} />
          <Metrica icono={Wallet} titulo="Comisión pendiente" valor={formatearRD(m.porEstado.pendiente)} />
          <Metrica icono={Wallet} titulo="Comisión aprobada" valor={formatearRD(m.porEstado.aprobada)} />
          <Metrica icono={Wallet} titulo="Comisión pagada" valor={formatearRD(m.porEstado.pagada)} />
          <Metrica icono={BadgePercent} titulo="Tu tasa" valor={`${afiliado.commission_rate}%`} />
        </div>
      )}

      {pestana === "productos" && (
        <TabProductos afiliado={afiliado} catalogo={catalogo} misProductos={misProductos} onCambio={cargar} />
      )}

      {pestana === "vitrina" && (
        <TabVitrina
          afiliado={afiliado}
          productos={misProductos.map((p) => ({
            id: p.id,
            titulo: p.titulo,
            precio: p.precio,
            precio_anterior: p.precioAnterior ?? null,
            imagen: p.imagen || null,
            tienda: p.tienda,
          }))}
          onGuardado={onCambio}
        />
      )}

      {pestana === "comisiones" && <TablaComisiones comisiones={comisiones} />}
    </div>
  );
}

function TabProductos({
  afiliado,
  catalogo,
  misProductos,
  onCambio,
}: {
  afiliado: Afiliado;
  catalogo: Producto[];
  misProductos: Producto[];
  onCambio: () => void;
}) {
  const [q, setQ] = useState("");
  const ids = new Set(misProductos.map((p) => p.id));
  const resultados = q.trim()
    ? catalogo.filter((p) => !ids.has(p.id) && `${p.titulo} ${p.tienda}`.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 12)
    : [];

  const agregar = async (p: Producto) => {
    const { error } = await supabase
      .from("affiliate_products")
      .insert({ affiliate_id: afiliado.id, product_id: p.id, position: misProductos.length });
    if (error) return void toast.error(error.message);
    toast.success("Añadido a tus productos.");
    onCambio();
  };
  const quitar = async (p: Producto) => {
    await supabase.from("affiliate_products").delete().eq("affiliate_id", afiliado.id).eq("product_id", p.id);
    onCambio();
  };
  const mover = async (i: number, d: -1 | 1) => {
    const otro = misProductos[i + d];
    const este = misProductos[i];
    if (!otro || !este) return;
    await Promise.all([
      supabase.from("affiliate_products").update({ position: i + d }).eq("affiliate_id", afiliado.id).eq("product_id", este.id),
      supabase.from("affiliate_products").update({ position: i }).eq("affiliate_id", afiliado.id).eq("product_id", otro.id),
    ]);
    onCambio();
  };
  const copiar = (texto: string) =>
    navigator.clipboard.writeText(texto).then(
      () => toast.success("Enlace copiado."),
      () => toast.error("No se pudo copiar."),
    );

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="card-uniko p-4">
        <h2 className="text-lg">Agregar productos</h2>
        <label className="relative mt-3 block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input className="input-uniko pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca por nombre o tienda…" />
        </label>
        <ul className="mt-3 grid gap-2">
          {resultados.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-xl border border-border p-2">
              {p.imagen && <img src={p.imagen} alt="" className="h-12 w-12 rounded-lg object-cover" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{p.titulo}</p>
                <p className="text-xs text-muted-foreground">
                  {p.tienda} · {formatearRD(p.precio)} · ganas {formatearRD((p.precio * afiliado.commission_rate) / 100)}
                </p>
              </div>
              <button type="button" onClick={() => void agregar(p)} className="btn-base btn-outline" aria-label={`Agregar ${p.titulo}`}>
                <Plus className="h-4 w-4" />
              </button>
            </li>
          ))}
          {q.trim() && !resultados.length && <li className="text-sm text-muted-foreground">Sin resultados.</li>}
        </ul>
      </section>

      <section className="card-uniko p-4">
        <h2 className="text-lg">Mis productos y enlaces</h2>
        <p className="text-xs text-muted-foreground">El orden es el de tu vitrina. Cada enlace es único y lleva tu nombre.</p>
        <ul className="mt-3 grid gap-2">
          {misProductos.map((p, i) => {
            const enlace = enlaceAfiliado(afiliado.slug, p.id);
            return (
              <li key={p.id} className="grid gap-2 rounded-xl border border-border p-3">
                <div className="flex items-center gap-3">
                  {p.imagen && <img src={p.imagen} alt="" className="h-12 w-12 rounded-lg object-cover" />}
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold">{p.titulo}</p>
                  <button type="button" onClick={() => void mover(i, -1)} disabled={i === 0} aria-label="Subir" className="btn-base btn-outline px-2">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => void mover(i, 1)} disabled={i === misProductos.length - 1} aria-label="Bajar" className="btn-base btn-outline px-2">
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => void quitar(p)} aria-label="Quitar" className="btn-base btn-outline px-2 text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <input readOnly value={enlace} className="input-uniko min-w-0 flex-1 text-xs" onFocus={(e) => e.target.select()} />
                  <button type="button" onClick={() => void copiar(enlace)} className="btn-base btn-brand">
                    <Copy className="h-4 w-4" /> Copiar
                  </button>
                </div>
              </li>
            );
          })}
          {!misProductos.length && <li className="text-sm text-muted-foreground">Busca a la izquierda y agrega tu primer producto.</li>}
        </ul>
      </section>
    </div>
  );
}

function TabVitrina({ afiliado, productos, onGuardado }: { afiliado: Afiliado; productos: ProductoVitrina[]; onGuardado: () => void }) {
  const [t, setT] = useState<Required<Tema>>({ ...TEMA_BASE, ...afiliado.theme });
  const [guardando, setGuardando] = useState(false);
  const set = <K extends keyof Tema>(k: K, v: Required<Tema>[K]) => setT((x) => ({ ...x, [k]: v }));

  const guardar = async () => {
    setGuardando(true);
    const { error } = await supabase.from("affiliates").update({ theme: t }).eq("id", afiliado.id);
    setGuardando(false);
    if (error) return void toast.error(error.message);
    toast.success("Vitrina guardada.");
    onGuardado();
  };

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <section className="card-uniko grid h-fit gap-4 p-4">
        <Campo label="Título">
          <input className="input-uniko" maxLength={60} value={t.titulo} onChange={(e) => set("titulo", e.target.value)} />
        </Campo>
        <Campo label="Descripción">
          <textarea className="input-uniko min-h-16" maxLength={200} value={t.bio} onChange={(e) => set("bio", e.target.value)} />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Color principal">
            <input type="color" className="h-10 w-full cursor-pointer rounded-lg border border-border" value={t.color} onChange={(e) => set("color", e.target.value)} />
          </Campo>
          <Campo label="Color del botón">
            <input type="color" className="h-10 w-full cursor-pointer rounded-lg border border-border" value={t.boton_color} onChange={(e) => set("boton_color", e.target.value)} />
          </Campo>
        </div>
        <Campo label="Texto del botón">
          <input className="input-uniko" maxLength={24} value={t.boton_texto} onChange={(e) => set("boton_texto", e.target.value)} />
        </Campo>
        <Campo label="Forma del botón">
          <select className="select-uniko" value={t.boton_forma} onChange={(e) => set("boton_forma", e.target.value as Required<Tema>["boton_forma"])}>
            <option value="pill">Redonda</option>
            <option value="redondeado">Esquinas suaves</option>
            <option value="recto">Recta</option>
          </select>
        </Campo>
        <Campo label="Disposición">
          <select className="select-uniko" value={t.disposicion} onChange={(e) => set("disposicion", e.target.value as Required<Tema>["disposicion"])}>
            <option value="cuadricula">Cuadrícula</option>
            <option value="lista">Lista</option>
          </select>
        </Campo>
        <p className="text-xs text-muted-foreground">El orden de los productos se cambia en la pestaña «Productos».</p>
        <button type="button" onClick={() => void guardar()} disabled={guardando} className="btn-base btn-brand">
          {guardando ? "Guardando…" : "Guardar vitrina"}
        </button>
        <div className="flex gap-2">
          <input readOnly value={enlaceVitrina(afiliado.slug)} className="input-uniko min-w-0 flex-1 text-xs" onFocus={(e) => e.target.select()} />
          <button
            type="button"
            className="btn-base btn-outline"
            onClick={() => void navigator.clipboard.writeText(enlaceVitrina(afiliado.slug)).then(() => toast.success("Enlace copiado."))}
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
      </section>
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-primary">Vista previa</p>
        <VitrinaVista nombre={`${afiliado.nombre} ${afiliado.apellido}`} tema={t} productos={productos} slug={null} />
      </div>
    </div>
  );
}

function Metrica({ icono: Icono, titulo, valor, nota }: { icono: typeof Wallet; titulo: string; valor: string; nota?: string | undefined }) {
  return (
    <div className="card-uniko p-4">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary">
        <Icono className="h-4 w-4" /> {titulo}
      </p>
      <p className="mt-2 text-2xl font-bold">{valor}</p>
      {nota && <p className="text-xs text-muted-foreground">{nota}</p>}
    </div>
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
