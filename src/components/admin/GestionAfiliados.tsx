import { Fragment, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { BadgePercent, ChevronDown, ChevronUp, ExternalLink, Pause, Play } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatearRD } from "@/data/marketplace";
import { ESTADO_COMISION, calcularMetricas, enlaceVitrina, type Afiliado, type Comision } from "@/lib/afiliados";

/** Admin → Afiliados: lista, métricas por afiliado, vitrina, ventas, estado, tasa y pagos. */
export function GestionAfiliados() {
  const [afiliados, setAfiliados] = useState<Afiliado[] | null>(null);
  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [clics, setClics] = useState<Record<string, number>>({});
  const [productos, setProductos] = useState<Record<string, { id: string; title: string }[]>>({});
  const [abierto, setAbierto] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const [a, c, k, p] = await Promise.all([
      supabase.from("affiliates").select("*").order("created_at", { ascending: false }),
      supabase.from("affiliate_commissions").select("*").order("created_at", { ascending: false }),
      supabase.from("affiliate_clicks").select("affiliate_id"),
      supabase.from("affiliate_products").select("affiliate_id, position, products(id, title)").order("position"),
    ]);
    if (a.error) toast.error(a.error.message);
    setAfiliados((a.data as Afiliado[]) ?? []);
    setComisiones((c.data as Comision[]) ?? []);
    const cuenta: Record<string, number> = {};
    for (const r of (k.data ?? []) as { affiliate_id: string }[]) cuenta[r.affiliate_id] = (cuenta[r.affiliate_id] ?? 0) + 1;
    setClics(cuenta);
    const porAfiliado: Record<string, { id: string; title: string }[]> = {};
    for (const r of (p.data ?? []) as unknown as { affiliate_id: string; products: { id: string; title: string } | null }[])
      if (r.products) (porAfiliado[r.affiliate_id] ??= []).push(r.products);
    setProductos(porAfiliado);
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const actualizar = async (a: Afiliado, cambio: Partial<Afiliado>, aviso: string) => {
    const { error } = await supabase.from("affiliates").update(cambio).eq("id", a.id);
    if (error) return void toast.error(error.message);
    toast.success(aviso);
    void cargar();
  };

  const pagar = async (c: Comision) => {
    const { error } = await supabase.from("affiliate_commissions").update({ status: "pagada" }).eq("id", c.id);
    if (error) return void toast.error(error.message);
    toast.success("Comisión marcada como pagada.");
    void cargar();
  };

  if (!afiliados) return <p className="p-8 text-center text-sm text-muted-foreground">Cargando afiliados…</p>;

  return (
    <div className="p-4">
      <h2 className="mb-4 flex items-center gap-2 font-semibold">
        <BadgePercent className="h-5 w-5 text-brand" /> Uniko Afiliados ({afiliados.length})
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-muted-foreground">
              <th className="px-4 py-3">Afiliado</th>
              <th className="px-4 py-3">Clics</th>
              <th className="px-4 py-3">Ventas</th>
              <th className="px-4 py-3">Ingresos</th>
              <th className="px-4 py-3">Por pagar</th>
              <th className="px-4 py-3">Tasa</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {!afiliados.length && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Aún no hay afiliados registrados.
                </td>
              </tr>
            )}
            {afiliados.map((a) => {
              const suyas = comisiones.filter((c) => c.affiliate_id === a.id);
              const m = calcularMetricas(clics[a.id] ?? 0, suyas);
              const ver = abierto === a.id;
              return (
                <Fragment key={a.id}>
                  <tr className="border-b border-border/60 align-top hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => setAbierto(ver ? null : a.id)} className="flex items-center gap-1 font-semibold">
                        {ver ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        {a.nombre} {a.apellido}
                      </button>
                      <p className="text-xs text-muted-foreground">
                        {a.telefono ?? "sin teléfono"} · desde {new Date(a.created_at).toLocaleDateString("es-DO")}
                      </p>
                    </td>
                    <td className="px-4 py-3">{m.clics}</td>
                    <td className="px-4 py-3">
                      {m.conversiones} <span className="text-xs text-muted-foreground">({m.unidades} u.)</span>
                    </td>
                    <td className="px-4 py-3">{formatearRD(m.ingresos)}</td>
                    <td className="px-4 py-3 font-semibold">{formatearRD(m.porEstado.aprobada)}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        max={90}
                        defaultValue={a.commission_rate}
                        aria-label={`Tasa de ${a.nombre}`}
                        className="input-uniko w-20"
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (v !== Number(a.commission_rate) && v >= 0 && v <= 90)
                            void actualizar(a, { commission_rate: v }, `Tasa de ${a.nombre}: ${v}%`);
                        }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() =>
                          void actualizar(
                            a,
                            { status: a.status === "activo" ? "pausado" : "activo" },
                            a.status === "activo" ? "Afiliado pausado." : "Afiliado activado.",
                          )
                        }
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          a.status === "activo" ? "bg-emerald-500/15 text-emerald-700" : "bg-amber-500/15 text-amber-700"
                        }`}
                      >
                        {a.status === "activo" ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                        {a.status === "activo" ? "Activo · pausar" : "Pausado · activar"}
                      </button>
                    </td>
                  </tr>
                  {ver && (
                    <tr className="border-b border-border/60 bg-muted/20">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                          <div className="grid gap-2 text-sm">
                            <p className="text-xs font-bold uppercase tracking-wide text-primary">Vitrina</p>
                            <a href={enlaceVitrina(a.slug)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                              <ExternalLink className="h-3.5 w-3.5" /> /afiliados/{a.slug}
                            </a>
                            <p className="text-xs text-muted-foreground">Cobro: {a.metodo_pago ?? "no indicado"}</p>
                            <p className="text-xs text-muted-foreground">
                              Guías aceptadas: {new Date(a.terms_accepted_at).toLocaleDateString("es-DO")}
                            </p>
                            <ul className="mt-1 grid gap-1">
                              {(productos[a.id] ?? []).map((p) => (
                                <li key={p.id} className="truncate text-xs">
                                  • {p.title}
                                </li>
                              ))}
                              {!productos[a.id]?.length && <li className="text-xs text-muted-foreground">Sin productos aún.</li>}
                            </ul>
                          </div>
                          <div className="overflow-x-auto">
                            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-primary">Ventas y comisiones</p>
                            <table className="w-full min-w-[560px] text-left text-xs">
                              <tbody>
                                {suyas.map((c) => (
                                  <tr key={c.id} className="border-b border-border/60">
                                    <td className="py-2 pr-3">{new Date(c.created_at).toLocaleDateString("es-DO")}</td>
                                    <td className="py-2 pr-3">
                                      {c.producto} × {c.cantidad}
                                    </td>
                                    <td className="py-2 pr-3">{formatearRD(Number(c.monto_venta))}</td>
                                    <td className="py-2 pr-3 font-semibold">{formatearRD(Number(c.comision))}</td>
                                    <td className="py-2 pr-3">
                                      <span className={`rounded-full px-2 py-0.5 font-bold ${ESTADO_COMISION[c.status].pill}`}>
                                        {ESTADO_COMISION[c.status].label}
                                      </span>
                                    </td>
                                    <td className="py-2">
                                      {c.status === "aprobada" && (
                                        <button type="button" onClick={() => void pagar(c)} className="font-semibold text-primary hover:underline">
                                          Marcar pagada
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                                {!suyas.length && (
                                  <tr>
                                    <td className="py-2 text-muted-foreground">Sin ventas todavía.</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Una comisión pasa a «Aprobada» cuando la orden se marca «Completada» y a «Anulada» si se cancela. «Por pagar» suma las aprobadas.
      </p>
    </div>
  );
}
