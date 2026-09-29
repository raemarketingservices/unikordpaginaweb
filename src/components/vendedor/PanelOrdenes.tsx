import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { formatearRD } from "@/data/marketplace";
import { toast } from "sonner";

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

const formatearFecha = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric" });
};

export function PanelOrdenes({ modo = "seller" }: { modo?: "seller" | "admin" }) {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [tiendas, setTiendas] = useState<{ id: string; name: string }[]>([]);
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState("todas");
  const [detalle, setDetalle] = useState<Orden | null>(null);

  const cargar = useCallback(async () => {
    if (!userId) {
      setOrdenes([]);
      setTiendas([]);
      setCargando(false);
      return;
    }
    setCargando(true);

    const [resTiendas, resOrdenes] = await Promise.all([
      supabase.from("stores").select("id, name").eq("owner_id", userId),
      supabase
        .from("purchase_requests")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    if (resTiendas.error) console.error(resTiendas.error);
    else setTiendas((resTiendas.data as { id: string; name: string }[]) ?? []);

    if (resOrdenes.error) console.error(resOrdenes.error);
    else setOrdenes((resOrdenes.data as Orden[]) ?? []);

    setCargando(false);
  }, [userId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const misNombres = new Set(tiendas.map((t) => t.name));

  const itemsMios = (o: Orden) =>
    (o.items ?? []).filter((it) => misNombres.has(it.tienda ?? ""));

  const cambiarEstado = async (o: Orden, nuevo: string) => {
    const { error } = await supabase
      .from("purchase_requests")
      .update({ status: nuevo })
      .eq("id", o.id);

    if (error) {
      toast.error(`No se pudo actualizar: ${error.message}`);
      return;
    }

    setOrdenes((lista) =>
      lista.map((x) => (x.id === o.id ? { ...x, status: nuevo } : x)),
    );
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

  const visibles =
    filtro === "todas" ? ordenes : ordenes.filter((o) => o.status === filtro);

  const pendientes = ordenes.filter((o) => o.status === "pendiente").length;
  const confirmadas = ordenes.filter((o) =>
    ["confirmada", "enviada"].includes(o.status),
  ).length;
  const totalVentas = ordenes
    .filter((o) => o.status !== "cancelada")
    .reduce((suma, o) => suma + (Number(o.total) || 0), 0);

  if (!userId) {
    return (
      <div className="card-uniko p-6 text-sm text-muted-foreground">
        Inicia sesión para ver las órdenes de tus tiendas.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">
          Órdenes {modo === "admin" ? "(admin)" : ""}
        </h2>
        <button className="btn-outline" onClick={() => void cargar()} type="button">
          Actualizar
        </button>
      </div>

      {tiendas.length === 0 && modo === "seller" && (
        <p className="text-sm text-muted-foreground">
          Aún no tienes tiendas vinculadas a tu cuenta.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card-uniko p-4">
          <p className="text-xs text-muted-foreground">Total órdenes</p>
          <p className="text-xl font-bold">{ordenes.length}</p>
        </div>
        <div className="card-uniko p-4">
          <p className="text-xs text-muted-foreground">Pendientes</p>
          <p className="text-xl font-bold">{pendientes}</p>
        </div>
        <div className="card-uniko p-4">
          <p className="text-xs text-muted-foreground">En curso</p>
          <p className="text-xl font-bold">{confirmadas}</p>
        </div>
        <div className="card-uniko p-4">
          <p className="text-xs text-muted-foreground">Ventas (no canceladas)</p>
          <p className="text-xl font-bold">{formatearRD(totalVentas)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {["todas", ...ESTADOS].map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setFiltro(e)}
            className={
              filtro === e
                ? "btn-base btn-brand"
                : "btn-outline"
            }
          >
            {e === "todas" ? "Todas" : e}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-muted-foreground">
              <th className="p-3 text-left">Orden</th>
              <th className="p-3 text-left">Fecha</th>
              <th className="p-3 text-left">Cliente</th>
              <th className="p-3 text-left">Productos</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3 text-left">Estado</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground">
                  Cargando órdenes…
                </td>
              </tr>
            )}
            {!cargando && visibles.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground">
                  No hay órdenes {filtro === "todas" ? "" : `en estado "${filtro}"`}.
                </td>
              </tr>
            )}
            {!cargando &&
              visibles.map((o) => {
                const mios = itemsMios(o);
                const resumen =
                  mios.length > 0
                    ? `${mios.length} × ${mios[0]?.titulo ?? ""}${
                        mios.length > 1 ? " …" : ""
                      }`
                    : `${(o.items ?? []).length} ítems`;

                return (
                  <tr key={o.id} className="border-b border-border last:border-0">
                    <td className="p-3 font-mono text-xs">{o.id.slice(0, 8)}</td>
                    <td className="p-3 text-sm">{formatearFecha(o.created_at)}</td>
                    <td className="p-3 text-sm">
                      <strong>{o.full_name}</strong>
                      <br />
                      <span className="text-xs text-muted-foreground">{o.phone}</span>
                    </td>
                    <td className="p-3 text-sm">{resumen}</td>
                    <td className="p-3 text-right text-sm font-semibold">
                      {formatearRD(Number(o.total) || 0)}
                    </td>
                    <td className="p-3">
                      <select
                        className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
                        value={o.status}
                        onChange={(e) => void cambiarEstado(o, e.target.value)}
                      >
                        {ESTADOS.map((e) => (
                          <option key={e} value={e}>
                            {e}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        className="btn-outline"
                        onClick={() => setDetalle(o)}
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {detalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="card-uniko max-h-[85vh] w-full max-w-lg overflow-y-auto p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold">
                  Orden #{detalle.id.slice(0, 8)}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {formatearFecha(detalle.created_at)} · {detalle.status}
                </p>
              </div>
              <button
                type="button"
                className="btn-outline"
                onClick={() => setDetalle(null)}
              >
                Cerrar
              </button>
            </div>

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
                  <dd className="text-right break-all">{detalle.email}</dd>
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

            <div className="mt-4 border-t border-border pt-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Productos
              </p>
              <ul className="grid gap-2 text-sm">
                {(detalle.items ?? []).map((it, i) => (
                  <li
                    key={`${it.id ?? i}-${i}`}
                    className={
                      misNombres.has(it.tienda ?? "")
                        ? "rounded-md border border-brand/40 bg-brand/5 p-2"
                        : "rounded-md border border-border p-2"
                    }
                  >
                    <div className="flex justify-between gap-3">
                      <span className="font-medium">{it.titulo ?? "Producto"}</span>
                      <span>{formatearRD((Number(it.precio) || 0) * (Number(it.cantidad) || 1))}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {it.tienda ?? "Tienda"} · {Number(it.cantidad) || 1} u.
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex justify-between text-sm font-semibold">
                <span>Total</span>
                <span>{formatearRD(Number(detalle.total) || 0)}</span>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <label className="text-sm">
                <span className="mr-2 text-muted-foreground">Estado</span>
                <select
                  className="rounded-md border border-border bg-background px-2 py-1"
                  value={detalle.status}
                  onChange={(e) => void cambiarEstado(detalle, e.target.value)}
                >
                  {ESTADOS.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
