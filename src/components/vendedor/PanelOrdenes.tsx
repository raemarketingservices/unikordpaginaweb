import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { formatearRD } from "@/data/marketplace";
import { toast } from "sonner";
import {
  ClipboardList,
  Clock3,
  DollarSign,
  Eye,
  Inbox,
  Loader2,
  PackageSearch,
  RefreshCw,
  ShoppingBag,
  Store,
  Truck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ItemOrden = {
  id?: string;
  titulo?: string;
  tienda?: string;
  precio?: number;
  cantidad?: number;
};

type Orden = {
  id: string;
  created_at: string;
  full_name: string;
  phone: string;
  email?: string;
  address?: string;
  note?: string | null;
  items: ItemOrden[];
  total: number | null;
  status: string;
  store_ids?: string[];
};

const ESTADOS = ["pendiente", "confirmada", "enviada", "completada", "cancelada"];

const ESTADO_META: Record<string, { label: string; pill: string }> = {
  pendiente: {
    label: "Pendiente",
    pill: "border-primary/25 bg-primary/10 text-primary",
  },
  confirmada: {
    label: "Confirmada",
    pill: "border-amber-500/30 bg-amber-500/10 text-amber-600",
  },
  enviada: {
    label: "Enviada",
    pill: "border-violet-500/30 bg-violet-500/10 text-violet-600",
  },
  completada: {
    label: "Completada",
    pill: "border-success/30 bg-success/10 text-success",
  },
  cancelada: {
    label: "Cancelada",
    pill: "border-destructive/30 bg-destructive/10 text-destructive",
  },
};

const metaDe = (estado: string) =>
  ESTADO_META[estado] ?? { label: estado, pill: "border-border bg-muted text-foreground" };

const formatearFecha = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" });
};

export function PanelOrdenes({ modo = "seller" }: { modo?: "seller" | "admin" }) {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [tiendas, setTiendas] = useState<{ id: string; name: string }[]>([]);
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [filtro, setFiltro] = useState("todas");
  const [detalle, setDetalle] = useState<Orden | null>(null);

  const cargar = useCallback(async () => {
    if (!userId) {
      setOrdenes([]);
      setTiendas([]);
      setCargando(false);
      return;
    }
    setActualizando(true);

    const [resTiendas, resOrdenes] = await Promise.all([
      supabase.from("stores").select("id, name").eq("owner_id", userId),
      supabase.from("purchase_requests").select("*").order("created_at", { ascending: false }),
    ]);

    if (resTiendas.error) console.error(resTiendas.error);
    else setTiendas((resTiendas.data as { id: string; name: string }[]) ?? []);

    if (resOrdenes.error) console.error(resOrdenes.error);
    else setOrdenes((resOrdenes.data as Orden[]) ?? []);

    setCargando(false);
    setActualizando(false);
  }, [userId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const misNombres = new Set(tiendas.map((t) => t.name));

  const itemsMios = (o: Orden) => (o.items ?? []).filter((it) => misNombres.has(it.tienda ?? ""));

  const cambiarEstado = async (o: Orden, nuevo: string) => {
    const { error } = await supabase
      .from("purchase_requests")
      .update({ status: nuevo })
      .eq("id", o.id);

    if (error) {
      toast.error(`No se pudo actualizar: ${error.message}`);
      return;
    }

    setOrdenes((lista) => lista.map((x) => (x.id === o.id ? { ...x, status: nuevo } : x)));
    setDetalle((d) => (d && d.id === o.id ? { ...d, status: nuevo } : d));
    toast.success(`Orden ${o.id.slice(0, 8)} → ${nuevo}`);

    if (o.phone) {
      void fetch("/api/whatsapp/avisar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "seller",
          nombre: o.full_name,
          telefono: o.phone,
          total: o.total ?? 0,
          estado: nuevo,
        }),
      }).catch(() => undefined);
    }
  };

  const visibles = filtro === "todas" ? ordenes : ordenes.filter((o) => o.status === filtro);

  const pendientes = ordenes.filter((o) => o.status === "pendiente").length;
  const enCurso = ordenes.filter((o) => ["confirmada", "enviada"].includes(o.status)).length;
  const totalVentas = ordenes
    .filter((o) => o.status !== "cancelada")
    .reduce((suma, o) => suma + (Number(o.total) || 0), 0);

  const resumen = (o: Orden) => {
    const mios = itemsMios(o);
    const cantidad = mios.length || (o.items ?? []).length;
    const primero = mios[0]?.titulo ?? (o.items ?? [])[0]?.titulo ?? "Producto";
    return cantidad > 1 ? `${cantidad} × ${primero} …` : `${cantidad} × ${primero}`;
  };

  if (!userId) {
    return (
      <div className="card-uniko flex flex-col items-center gap-4 p-10 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-brand">
          <ClipboardList className="h-6 w-6" />
        </span>
        <div>
          <h2 className="text-lg font-bold">Órdenes de tus tiendas</h2>
          <p className="text-sm text-muted-foreground">
            Inicia sesión para ver y gestionar las compras recibidas.
          </p>
        </div>
        <Link to="/auth" className="btn-base btn-brand">
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary">
            <Store className="h-3.5 w-3.5" /> Panel del vendedor
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold">
            <ClipboardList className="h-6 w-6 text-brand" />
            {modo === "admin" ? "Órdenes (admin)" : "Órdenes"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tiendas.length > 0
              ? `Tiendas: ${tiendas.map((t) => t.name).join(", ")}`
              : "Aún no tienes tiendas vinculadas a tu cuenta."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/publicar" className="btn-base btn-outline">
            <PackageSearch className="h-4 w-4" /> Publicar producto
          </Link>
          <button
            type="button"
            onClick={() => void cargar()}
            disabled={actualizando}
            className="btn-base btn-brand"
          >
            {actualizando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {actualizando ? "Actualizando…" : "Actualizar"}
          </button>
        </div>
      </div>

      {tiendas.length === 0 && modo === "seller" && (
        <div className="grid gap-3 rounded-2xl border border-brand/30 bg-brand/5 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand">
            <Store className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold">Todavía no tienes una tienda</p>
            <p className="text-xs text-muted-foreground">
              Crea tu tienda para recibir órdenes de compra aquí.
            </p>
          </div>
          <Link to="/vender" className="btn-base btn-brand">
            Crear mi tienda
          </Link>
        </div>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card-uniko p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <ShoppingBag className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs text-muted-foreground">Total órdenes</p>
              <p className="text-lg font-bold leading-tight">{ordenes.length}</p>
            </div>
          </div>
        </div>
        <div className="card-uniko p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
              <Clock3 className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs text-muted-foreground">Pendientes</p>
              <p className="text-lg font-bold leading-tight">{pendientes}</p>
            </div>
          </div>
        </div>
        <div className="card-uniko p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-600">
              <Truck className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs text-muted-foreground">En curso</p>
              <p className="text-lg font-bold leading-tight">{enCurso}</p>
            </div>
          </div>
        </div>
        <div className="card-uniko p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-success/10 text-success">
              <DollarSign className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs text-muted-foreground">Ventas netas</p>
              <p className="text-lg font-bold leading-tight">{formatearRD(totalVentas)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros por estado */}
      <div className="flex flex-wrap gap-2">
        {["todas", ...ESTADOS].map((e) => {
          const activo = filtro === e;
          const cuenta =
            e === "todas" ? ordenes.length : ordenes.filter((o) => o.status === e).length;
          const etiqueta = e === "todas" ? "Todas" : metaDe(e).label;
          return (
            <button
              key={e}
              type="button"
              onClick={() => setFiltro(e)}
              className={`btn-base ${activo ? "btn-brand" : "btn-outline"}`}
            >
              {etiqueta}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                  activo ? "bg-white/25 text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                {cuenta}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tabla (desktop) */}
      <div className="card-uniko hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Orden</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Productos</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Cargando órdenes…
                    </span>
                  </td>
                </tr>
              )}
              {!cargando && visibles.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <Inbox className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm font-semibold">No hay órdenes</p>
                      <p className="text-xs text-muted-foreground">
                        {filtro === "todas"
                          ? "Cuando alguien compre en tu tienda aparecerá aquí."
                          : `No tienes órdenes con estado “${filtro}”.`}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
              {!cargando &&
                visibles.map((o) => {
                  const meta = metaDe(o.status);
                  return (
                    <tr
                      key={o.id}
                      className="border-b border-border/60 align-top transition-colors last:border-0 hover:bg-muted/40"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        #{o.id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3">{formatearFecha(o.created_at)}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold">{o.full_name}</p>
                        <p className="text-xs text-muted-foreground">{o.phone}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{resumen(o)}</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatearRD(Number(o.total) || 0)}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          aria-label={`Estado de la orden ${o.id.slice(0, 8)}`}
                          className={`cursor-pointer appearance-none rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide outline-none transition-colors ${meta.pill}`}
                          value={o.status}
                          onChange={(e) => void cambiarEstado(o, e.target.value)}
                        >
                          {ESTADOS.map((e) => (
                            <option key={e} value={e} className="bg-background text-foreground">
                              {metaDe(e).label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          title="Ver detalle"
                          aria-label={`Ver detalle de la orden ${o.id.slice(0, 8)}`}
                          onClick={() => setDetalle(o)}
                          className="inline-grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tarjetas (móvil) */}
      <div className="space-y-3 md:hidden">
        {cargando && (
          <div className="card-uniko flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando órdenes…
          </div>
        )}
        {!cargando && visibles.length === 0 && (
          <div className="card-uniko flex flex-col items-center gap-2 p-8 text-center">
            <Inbox className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">No hay órdenes</p>
            <p className="text-xs text-muted-foreground">
              {filtro === "todas"
                ? "Cuando alguien compre en tu tienda aparecerá aquí."
                : `No tienes órdenes con estado “${filtro}”.`}
            </p>
          </div>
        )}
        {!cargando &&
          visibles.map((o) => {
            const meta = metaDe(o.status);
            return (
              <div key={o.id} className="card-uniko space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{o.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      #{o.id.slice(0, 8)} · {formatearFecha(o.created_at)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${meta.pill}`}
                  >
                    {meta.label}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{resumen(o)}</span>
                  <span className="font-semibold">{formatearRD(Number(o.total) || 0)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    aria-label={`Estado de la orden ${o.id.slice(0, 8)}`}
                    className={`cursor-pointer appearance-none rounded-full border px-3 py-1.5 text-center text-xs font-bold uppercase tracking-wide outline-none ${meta.pill}`}
                    value={o.status}
                    onChange={(e) => void cambiarEstado(o, e.target.value)}
                  >
                    {ESTADOS.map((e) => (
                      <option key={e} value={e} className="bg-background text-foreground">
                        {metaDe(e).label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setDetalle(o)}
                    className="btn-base btn-outline w-full"
                  >
                    <Eye className="h-4 w-4" /> Ver detalle
                  </button>
                </div>
              </div>
            );
          })}
      </div>

      {/* Detalle */}
      <Dialog open={!!detalle} onOpenChange={(abierto) => !abierto && setDetalle(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:rounded-2xl">
          {detalle && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-brand" />
                  Orden #{detalle.id.slice(0, 8)}
                </DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-2">
                  {formatearFecha(detalle.created_at)}
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                      metaDe(detalle.status).pill
                    }`}
                  >
                    {metaDe(detalle.status).label}
                  </span>
                </DialogDescription>
              </DialogHeader>

              <dl className="grid gap-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Cliente</dt>
                  <dd className="text-right font-medium">{detalle.full_name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Teléfono</dt>
                  <dd className="text-right">{detalle.phone}</dd>
                </div>
                {detalle.email && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Correo</dt>
                    <dd className="break-all text-right">{detalle.email}</dd>
                  </div>
                )}
                {detalle.address && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Dirección</dt>
                    <dd className="text-right">{detalle.address}</dd>
                  </div>
                )}
                {detalle.note && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Nota</dt>
                    <dd className="text-right">{detalle.note}</dd>
                  </div>
                )}
              </dl>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-primary">
                  Productos
                </p>
                <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                  {(detalle.items ?? []).map((it, i) => {
                    const mio = misNombres.has(it.tienda ?? "");
                    return (
                      <li
                        key={`${it.id ?? i}-${i}`}
                        className={`flex items-start justify-between gap-3 p-3 text-sm ${
                          mio ? "bg-brand/5" : "bg-background"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{it.titulo ?? "Producto"}</p>
                          <p className="text-xs text-muted-foreground">
                            {it.tienda ?? "Tienda"} · {Number(it.cantidad) || 1} u.
                            {mio && <span className="ml-1 font-semibold text-brand">· tuyo</span>}
                          </p>
                        </div>
                        <span className="shrink-0 font-semibold">
                          {formatearRD((Number(it.precio) || 0) * (Number(it.cantidad) || 1))}
                        </span>
                      </li>
                    );
                  })}
                  {(detalle.items ?? []).length === 0 && (
                    <li className="p-3 text-sm text-muted-foreground">Sin productos.</li>
                  )}
                </ul>
                <div className="mt-3 flex justify-between rounded-xl bg-muted px-3 py-2 text-sm font-bold">
                  <span>Total</span>
                  <span>{formatearRD(Number(detalle.total) || 0)}</span>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:justify-between">
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Estado</span>
                  <select
                    className={`cursor-pointer appearance-none rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide outline-none ${
                      metaDe(detalle.status).pill
                    }`}
                    value={detalle.status}
                    onChange={(e) => void cambiarEstado(detalle, e.target.value)}
                  >
                    {ESTADOS.map((e) => (
                      <option key={e} value={e} className="bg-background text-foreground">
                        {metaDe(e).label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="btn-base btn-brand"
                  onClick={() => setDetalle(null)}
                >
                  Listo
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
