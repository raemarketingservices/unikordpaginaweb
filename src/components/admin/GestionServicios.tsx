import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { api } from "@/lib/cloudflare";
import type { ServiceRow } from "@/lib/types";

export function GestionServicios() {
  const [items, setItems] = useState<ServiceRow[] | null>(null);
  useEffect(() => { api<ServiceRow[]>("/api/admin/services").then(setItems).catch((err) => {
    toast.error(err instanceof Error ? err.message : "No se pudieron cargar los servicios."); setItems([]);
  }); }, []);
  if (!items) return <p className="p-8 text-center text-sm text-muted-foreground">Cargando servicios…</p>;
  const patch = async (item: ServiceRow, changes: Partial<ServiceRow>) => {
    try {
      await api(`/api/admin/services/${item.id}`, { method: "PATCH", body: JSON.stringify(changes) });
      setItems((prev) => prev?.map((s) => s.id === item.id ? { ...s, ...changes } : s) ?? []);
    } catch (err) { toast.error(err instanceof Error ? err.message : "No se pudo guardar."); }
  };
  return <div className="divide-y divide-border">
    <h2 className="py-3 font-semibold">Servicios ({items.length})</h2>
    {items.map((item) => <article key={item.id} className="flex flex-wrap items-center gap-3 py-3">
      <div className="min-w-48 flex-1"><p className="font-semibold">{item.title}</p><p className="text-xs text-muted-foreground">{item.provider} · Desde RD${item.price_from.toLocaleString("es-DO")}</p></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(item.verified)} onChange={(e) => void patch(item, { verified: e.target.checked })} /> Verificado</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(item.recommended)} onChange={(e) => void patch(item, { recommended: e.target.checked })} /> Recomendado</label>
      <button type="button" title="Eliminar servicio" className="btn-base btn-outline px-2" onClick={async () => {
        if (!window.confirm(`¿Eliminar ${item.title}?`)) return;
        try { await api(`/api/admin/services/${item.id}`, { method: "DELETE" }); setItems((prev) => prev?.filter((s) => s.id !== item.id) ?? []); }
        catch (err) { toast.error(err instanceof Error ? err.message : "No se pudo eliminar."); }
      }}><Trash2 className="h-4 w-4" /></button>
    </article>)}
    {items.length === 0 && <p className="py-6 text-sm text-muted-foreground">No hay servicios en D1.</p>}
  </div>;
}
