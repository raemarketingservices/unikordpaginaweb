import { formatearRD } from "@/data/marketplace";
import { ESTADO_COMISION, type Comision } from "@/lib/afiliados";

export function TablaComisiones({ comisiones }: { comisiones: Comision[] }) {
  return (
    <div className="card-uniko mt-6 overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase text-muted-foreground">
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Producto</th>
            <th className="px-4 py-3">Venta</th>
            <th className="px-4 py-3">Comisión</th>
            <th className="px-4 py-3">Estado</th>
          </tr>
        </thead>
        <tbody>
          {comisiones.map((c) => (
            <tr key={c.id} className="border-b border-border/60 hover:bg-muted/40">
              <td className="px-4 py-3">{new Date(c.created_at).toLocaleDateString("es-DO")}</td>
              <td className="px-4 py-3">
                {c.producto ?? "—"} <span className="text-xs text-muted-foreground">× {c.cantidad}</span>
              </td>
              <td className="px-4 py-3">{formatearRD(Number(c.monto_venta))}</td>
              <td className="px-4 py-3 font-semibold">
                {formatearRD(Number(c.comision))} <span className="text-xs text-muted-foreground">({c.tasa}%)</span>
              </td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${ESTADO_COMISION[c.status].pill}`}>
                  {ESTADO_COMISION[c.status].label}
                </span>
              </td>
            </tr>
          ))}
          {!comisiones.length && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                Aún no hay ventas. Comparte tus enlaces para empezar a ganar.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
