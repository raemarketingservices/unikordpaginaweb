import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Building2, Eye, EyeOff, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { OPERACIONES, fetchPropiedadesAdmin, precioTexto, type Propiedad } from "@/lib/propiedades";

/** Admin → Propiedades: ver todas, ocultar/publicar y eliminar. */
export function GestionPropiedades() {
  const [lista, setLista] = useState<Propiedad[] | null>(null);

  useEffect(() => {
    fetchPropiedadesAdmin()
      .then(setLista)
      .catch((e: Error) => {
        toast.error(e.message);
        setLista([]);
      });
  }, []);

  const alternar = async (p: Propiedad) => {
    const approved = p.approved === false;
    const { error } = await supabase.from("properties").update({ approved }).eq("id", p.id);
    if (error) return void toast.error(error.message);
    setLista((v) => v?.map((x) => (x.id === p.id ? { ...x, approved } : x)) ?? v);
    toast.success(approved ? "Propiedad publicada." : "Propiedad oculta (no se borró).");
  };

  const borrar = async (p: Propiedad) => {
    if (!window.confirm(`¿Eliminar «${p.titulo}»? No se puede deshacer.`)) return;
    const { error } = await supabase.from("properties").delete().eq("id", p.id);
    if (error) return void toast.error(error.message);
    setLista((v) => v?.filter((x) => x.id !== p.id) ?? v);
    toast.success("Propiedad eliminada.");
  };

  if (!lista) return <p className="p-8 text-center text-sm text-muted-foreground">Cargando propiedades…</p>;

  return (
    <div className="p-4">
      <h2 className="mb-4 flex items-center gap-2 font-semibold">
        <Building2 className="h-5 w-5 text-brand" /> Propiedades ({lista.length})
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Propiedad</th>
              <th className="px-4 py-3">Inmobiliaria / agente</th>
              <th className="px-4 py-3">Precio</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {!lista.length && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  Todavía no hay propiedades publicadas.
                </td>
              </tr>
            )}
            {lista.map((p) => (
              <tr key={p.id} className="border-b border-border/60 align-top hover:bg-muted/40">
                <td className="px-4 py-3">
                  <a href={`/propiedades/${p.id}`} className="font-semibold hover:underline">
                    {p.titulo}
                  </a>
                  <p className="text-xs text-muted-foreground">
                    {OPERACIONES[p.operacion]} · {p.provincia ?? "—"}
                  </p>
                  <div className="mt-1.5 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => void alternar(p)}
                      className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10"
                    >
                      {p.approved === false ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      {p.approved === false ? "Publicar" : "Ocultar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void borrar(p)}
                      className="inline-flex items-center gap-1 rounded-full border border-destructive/40 px-2.5 py-1 text-[11px] font-semibold text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3" /> Eliminar
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {p.property_agents?.nombre ?? "—"}
                  <p className="text-xs">{p.property_agents?.tipo === "inmobiliaria" ? "Inmobiliaria" : "Agente"}</p>
                </td>
                <td className="px-4 py-3">{precioTexto(p)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      p.approved === false ? "bg-amber-500/15 text-amber-600" : "bg-emerald-500/15 text-emerald-600"
                    }`}
                  >
                    {p.approved === false ? "Oculta" : "Publicada"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
