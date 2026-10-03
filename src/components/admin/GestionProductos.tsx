import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Package, Search, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchProductosAdmin } from "@/lib/queries";
import type { ProductWithStoreRow } from "@/lib/types";
import { api, CLOUDFLARE_API } from "@/lib/cloudflare";

export function GestionProductos() {
  const [productos, setProductos] = useState<ProductWithStoreRow[] | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [guardandoId, setGuardandoId] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    fetchProductosAdmin()
      .then((p) => {
        if (activo) setProductos(p);
      })
      .catch((err: unknown) => {
        toast.error(err instanceof Error ? err.message : "No pudimos cargar los productos.");
        if (activo) setProductos([]);
      });
    return () => {
      activo = false;
    };
  }, []);

  const filtrados = useMemo(() => {
    if (!productos) return [];
    const q = busqueda.trim().toLowerCase();
    if (!q) return productos;
    return productos.filter((p) =>
      [p.title, p.sku, p.stores?.name, p.category]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [productos, busqueda]);

  const alternar = async (id: string, campo: "featured" | "best_seller" | "verified") => {
    const producto = productos?.find((p) => p.id === id);
    if (!producto) return;
    const valor = !producto[campo];
    setGuardandoId(id);
    let error: Error | null = null;
    try {
      if (CLOUDFLARE_API) await api(`/api/admin/products/${id}`, { method: "PATCH", body: JSON.stringify({ [campo]: valor }) });
      else { const result = await supabase.from("products").update({ [campo]: valor }).eq("id", id); if (result.error) error = new Error(result.error.message); }
    } catch (err) { error = err instanceof Error ? err : new Error("No se pudo guardar."); }
    setGuardandoId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setProductos((prev) =>
      prev ? prev.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)) : prev,
    );
  };

  if (!productos) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Cargando productos…</div>;
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 font-semibold">
          <Package className="h-5 w-5 text-brand" /> Artículos ({productos.length})
        </h2>
        <label className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por título, SKU o tienda…"
            className="input-uniko pl-9"
          />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-3">Artículo</th>
              <th className="py-2 pr-3">SKU</th>
              <th className="py-2 pr-3">Precio</th>
              <th className="py-2 pr-3">Tienda</th>
              <th className="py-2 pr-3">Publicado</th>
              <th className="py-2 pr-3">Verificado</th>
              <th className="py-2 pr-3">Destacado</th>
              <th className="py-2">Más vendido</th>
              <th className="py-2">Acción</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={9} className="py-8 text-center text-muted-foreground">
                  Sin resultados para “{busqueda}”.
                </td>
              </tr>
            )}
            {filtrados.map((p) => (
              <tr key={p.id} className="border-b border-border/60 align-top">
                <td className="py-2.5 pr-3">
                  <div className="flex items-center gap-2">
                    {p.image ? (
                      <img src={p.image} alt="" className="h-8 w-8 rounded-lg object-cover" />
                    ) : (
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-muted">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </span>
                    )}
                    <span className="font-semibold">{p.title}</span>
                  </div>
                </td>
                <td className="py-2.5 pr-3 font-mono text-xs text-muted-foreground">
                  {p.sku ?? "—"}
                </td>
                <td className="py-2.5 pr-3">RD${p.price.toLocaleString("es-DO")}</td>
                <td className="py-2.5 pr-3 text-muted-foreground">{p.stores?.name ?? "—"}</td>
                <td className="py-2.5 pr-3 text-xs text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString("es-DO")}
                </td>
                <td className="py-2.5 pr-3">
                  <input
                    type="checkbox"
                    checked={p.verified}
                    disabled={guardandoId === p.id}
                    onChange={() => alternar(p.id, "verified")}
                    className="rounded border-border accent-brand"
                  />
                </td>
                <td className="py-2.5 pr-3">
                  <input
                    type="checkbox"
                    checked={p.featured}
                    disabled={guardandoId === p.id}
                    onChange={() => alternar(p.id, "featured")}
                    className="rounded border-border accent-brand"
                  />
                </td>
                <td className="py-2.5">
                  <input
                    type="checkbox"
                    checked={p.best_seller}
                    disabled={guardandoId === p.id}
                    onChange={() => alternar(p.id, "best_seller")}
                    className="rounded border-border accent-brand"
                  />
                </td>
                <td className="py-2.5"><button type="button" title="Eliminar producto" className="btn-base btn-outline px-2" onClick={async () => {
                  if (!window.confirm(`¿Eliminar ${p.title}?`)) return;
                  try {
                    if (CLOUDFLARE_API) await api(`/api/admin/products/${p.id}`, { method: "DELETE" });
                    else { const { error } = await supabase.from("products").delete().eq("id", p.id); if (error) throw new Error(error.message); }
                    setProductos((prev) => prev?.filter((item) => item.id !== p.id) ?? []);
                    toast.success("Producto eliminado.");
                  } catch (err) { toast.error(err instanceof Error ? err.message : "No se pudo eliminar el producto."); }
                }}><Trash2 className="h-4 w-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
