import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Clock, Search, Store, Trash2, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchTiendasAdmin, fetchPerfilesAdmin } from "@/lib/queries";
import { api, CLOUDFLARE_API } from "@/lib/cloudflare";
import type { StoreRow, ProfileRow } from "@/lib/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function GestionTiendas() {
  const [tiendas, setTiendas] = useState<StoreRow[] | null>(null);
  const [duenos, setDuenos] = useState<Record<string, ProfileRow>>({});
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<"todas" | "pendientes" | "aprobadas">("todas");
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [porEliminar, setPorEliminar] = useState<StoreRow | null>(null);
  const [confirmarTodas, setConfirmarTodas] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    let activo = true;
    Promise.all([fetchTiendasAdmin(), fetchPerfilesAdmin()])
      .then(([t, p]) => {
        if (!activo) return;
        setTiendas(t);
        setDuenos(Object.fromEntries(p.map((perfil) => [perfil.id, perfil])));
      })
      .catch((err: unknown) => {
        toast.error(err instanceof Error ? err.message : "No pudimos cargar las tiendas.");
        if (activo) setTiendas([]);
      });
    return () => {
      activo = false;
    };
  }, []);

  const filtradas = useMemo(() => {
    if (!tiendas) return [];
    const q = busqueda.trim().toLowerCase();
    return tiendas.filter((t) => {
      if (filtro === "pendientes" && t.approved !== false) return false;
      if (filtro === "aprobadas" && t.approved === false) return false;
      if (!q) return true;
      return [t.name, t.category, t.location, t.rnc]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [tiendas, busqueda, filtro]);

  const alternar = async (id: string, campo: "verified" | "featured" | "approved") => {
    const tienda = tiendas?.find((t) => t.id === id);
    if (!tienda) return;
    const valor = !tienda[campo];
    setGuardandoId(id);
    let error: Error | null = null;
    try {
      if (CLOUDFLARE_API) await api(`/api/admin/stores/${id}`, { method: "PATCH", body: JSON.stringify({ [campo]: valor }) });
      else { const result = await supabase.from("stores").update({ [campo]: valor }).eq("id", id); if (result.error) error = new Error(result.error.message); }
    } catch (err) { error = err instanceof Error ? err : new Error("No se pudo guardar."); }
    setGuardandoId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setTiendas((prev) =>
      prev ? prev.map((t) => (t.id === id ? { ...t, [campo]: valor } : t)) : prev,
    );
    if (campo === "approved") {
      toast.success(
        valor
          ? "Tienda aprobada: ya es visible en el marketplace."
          : "Tienda suspendida: vuelve a la cola de pendientes.",
      );
    }
  };

  const eliminar = async (ids: string[]) => {
    if (!ids.length || eliminando) return;
    setEliminando(true);
    try {
      if (CLOUDFLARE_API) await Promise.all(ids.map((id) => api(`/api/admin/stores/${id}`, { method: "DELETE" })));
      else { const { error } = await supabase.from("stores").delete().in("id", ids); if (error) throw new Error(error.message); }
      setTiendas((prev) => (prev ? prev.filter((t) => !ids.includes(t.id)) : prev));
      toast.success(
        ids.length === 1
          ? "Tienda eliminada de Supabase."
          : `${ids.length} tiendas eliminadas de Supabase.`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No pudimos eliminar la tienda.");
    } finally {
      setEliminando(false);
      setPorEliminar(null);
      setConfirmarTodas(false);
    }
  };

  const eliminarTodas = async () => {
    if (!tiendas?.length || eliminando) return;
    setEliminando(true);
    try {
      if (CLOUDFLARE_API) await Promise.all((tiendas ?? []).map((store) => api(`/api/admin/stores/${store.id}`, { method: "DELETE" })));
      else { const { error } = await supabase.from("stores").delete().neq("id", ""); if (error) throw new Error(error.message); }
      setTiendas([]);
      toast.success("Todas las tiendas fueron eliminadas.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No pudimos eliminar las tiendas.");
    } finally {
      setEliminando(false);
      setPorEliminar(null);
      setConfirmarTodas(false);
    }
  };

  if (!tiendas) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Cargando tiendas…</div>;
  }

  const pendientes = tiendas.filter((t) => t.approved === false).length;
  const filtros = [
    { valor: "todas", etiqueta: `Todas (${tiendas.length})` },
    { valor: "pendientes", etiqueta: `Pendientes (${pendientes})` },
    { valor: "aprobadas", etiqueta: "Aprobadas" },
  ] as const;

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="flex items-center gap-2 font-semibold">
            <Store className="h-5 w-5 text-brand" /> Tiendas ({tiendas.length})
          </h2>
          <div className="flex items-center gap-1 rounded-full border border-border bg-background p-1 text-xs font-semibold">
            {filtros.map((op) => (
              <button
                key={op.valor}
                type="button"
                onClick={() => setFiltro(op.valor)}
                className={`rounded-full px-3 py-1 ${
                  filtro === op.valor
                    ? op.valor === "pendientes" && pendientes > 0
                      ? "bg-amber-500 text-black"
                      : "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {op.etiqueta}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!tiendas.length || eliminando}
            onClick={() => setConfirmarTodas(true)}
            className="btn-base inline-flex items-center gap-1.5 border border-destructive/40 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" /> Eliminar todas
          </button>
          <label className="relative sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar tienda, RNC, ubicación…"
              className="input-uniko pl-9"
            />
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-3">Tienda</th>
              <th className="py-2 pr-3">Propietario</th>
              <th className="py-2 pr-3">RNC</th>
              <th className="py-2 pr-3">Ubicación</th>
              <th className="py-2 pr-3">Estado</th>
              <th className="py-2 pr-3">Rating</th>
              <th className="py-2 pr-3">Productos</th>
              <th className="py-2 pr-3">Verificada</th>
              <th className="py-2 pr-3">Destacada</th>
              <th className="py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={10} className="py-8 text-center text-muted-foreground">
                  {filtro === "pendientes"
                    ? "No hay tiendas pendientes de aprobación."
                    : busqueda.trim()
                      ? `Sin resultados para “${busqueda}”.`
                      : "Todavía no hay tiendas en la plataforma."}
                </td>
              </tr>
            )}
            {filtradas.map((t) => (
              <tr key={t.id} className="border-b border-border/60 align-top">
                <td className="py-2.5 pr-3 font-semibold">
                  <div className="flex items-center gap-2">
                    {t.logo ? (
                      <img src={t.logo} alt="" className="h-7 w-7 rounded-lg object-cover" />
                    ) : (
                      <span className="grid h-7 w-7 place-items-center rounded-lg bg-muted text-xs font-bold">
                        {t.name.slice(0, 1)}
                      </span>
                    )}
                    <span className="truncate">{t.name}</span>
                  </div>
                </td>
                <td className="py-2.5 pr-3 text-muted-foreground">
                  {t.owner_name ??
                    (duenos[t.owner_id ?? ""]
                      ? (duenos[t.owner_id ?? ""]?.full_name ??
                        duenos[t.owner_id ?? ""]?.email ??
                        "—")
                      : "—")}
                </td>
                <td className="py-2.5 pr-3 text-muted-foreground">{t.rnc ?? "—"}</td>
                <td className="py-2.5 pr-3 text-muted-foreground">{t.location ?? "—"}</td>
                <td className="py-2.5 pr-3">
                  <div className="flex flex-col gap-1">
                    <span
                      className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        t.approved === false
                          ? "bg-amber-500/15 text-amber-600"
                          : "bg-emerald-500/15 text-emerald-600"
                      }`}
                    >
                      {t.approved === false ? (
                        <Clock className="h-3 w-3" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3" />
                      )}
                      {t.approved === false ? "Pendiente" : "Aprobada"}
                    </span>
                    <button
                      type="button"
                      disabled={guardandoId === t.id}
                      onClick={() => alternar(t.id, "approved")}
                      className={`inline-flex w-fit items-center gap-1 text-[11px] font-semibold ${
                        t.approved === false
                          ? "text-primary hover:underline"
                          : "text-muted-foreground hover:text-destructive"
                      }`}
                    >
                      {t.approved === false ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" /> Aprobar
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3" /> Suspender
                        </>
                      )}
                    </button>
                  </div>
                </td>
                <td className="py-2.5 pr-3">
                  {Number(t.rating).toFixed(1)} ({t.reviews})
                </td>
                <td className="py-2.5 pr-3">{t.products_count}</td>
                <td className="py-2.5 pr-3">
                  <input
                    type="checkbox"
                    checked={t.verified}
                    disabled={guardandoId === t.id}
                    onChange={() => alternar(t.id, "verified")}
                    className="rounded border-border accent-brand"
                  />
                </td>
                <td className="py-2.5 pr-3">
                  <input
                    type="checkbox"
                    checked={t.featured}
                    disabled={guardandoId === t.id}
                    onChange={() => alternar(t.id, "featured")}
                    className="rounded border-border accent-brand"
                  />
                </td>
                <td className="py-2.5">
                  <button
                    type="button"
                    disabled={eliminando}
                    onClick={() => setPorEliminar(t)}
                    aria-label={`Eliminar ${t.name}`}
                    title="Eliminar tienda"
                    className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AlertDialog
        open={!!porEliminar}
        onOpenChange={(abierto) => !abierto && setPorEliminar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar “{porEliminar?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borra la tienda de Supabase junto con sus productos y reseñas. Esta acción no se
              puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={eliminando}
              onClick={() => porEliminar && eliminar([porEliminar.id])}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {eliminando ? "Eliminando…" : "Eliminar tienda"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirmarTodas}
        onOpenChange={(abierto) => !abierto && setConfirmarTodas(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar todas las tiendas?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borrarán {tiendas.length} tiendas de Supabase, junto con todos sus productos y
              reseñas. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={eliminando}
              onClick={eliminarTodas}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {eliminando ? "Eliminando…" : `Eliminar ${tiendas.length} tiendas`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
