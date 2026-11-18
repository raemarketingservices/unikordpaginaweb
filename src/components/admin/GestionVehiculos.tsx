import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CarFront, Eye, EyeOff, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { TIPOS_VEHICULO, dinero, fetchVehiculosAdmin, nombreVehiculo, type Vehiculo } from "@/lib/vehiculos";

/** Admin → Vehículos: ver todos, ocultar/publicar y eliminar. */
export function GestionVehiculos() {
  const [lista, setLista] = useState<Vehiculo[] | null>(null);

  useEffect(() => {
    fetchVehiculosAdmin()
      .then(setLista)
      .catch((e: Error) => {
        toast.error(e.message);
        setLista([]);
      });
  }, []);

  const alternar = async (p: Vehiculo) => {
    const approved = p.approved === false;
    const { error } = await supabase.from("vehicles").update({ approved }).eq("id", p.id);
    if (error) return void toast.error(error.message);
    setLista((v) => v?.map((x) => (x.id === p.id ? { ...x, approved } : x)) ?? v);
    toast.success(approved ? "Vehículo publicado." : "Vehículo oculto (no se borró).");
  };

  const borrar = async (p: Vehiculo) => {
    if (!window.confirm(`¿Eliminar «${nombreVehiculo(p)}»? No se puede deshacer.`)) return;
    const { error } = await supabase.from("vehicles").delete().eq("id", p.id);
    if (error) return void toast.error(error.message);
    setLista((v) => v?.filter((x) => x.id !== p.id) ?? v);
    toast.success("Vehículo eliminado.");
  };

  if (!lista) return <p className="p-8 text-center text-sm text-muted-foreground">Cargando vehículos…</p>;

  return (
    <div className="p-4">
      <h2 className="mb-4 flex items-center gap-2 font-semibold">
        <CarFront className="h-5 w-5 text-brand" /> Vehículos ({lista.length})
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Vehículo</th>
              <th className="px-4 py-3">Rent-A-Car / dueño</th>
              <th className="px-4 py-3">Tarifa / día</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {!lista.length && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  Todavía no hay vehículos publicados.
                </td>
              </tr>
            )}
            {lista.map((p) => (
              <tr key={p.id} className="border-b border-border/60 align-top hover:bg-muted/40">
                <td className="px-4 py-3">
                  <a href={`/vehiculos/${p.id}`} className="font-semibold hover:underline">
                    {nombreVehiculo(p)}
                  </a>
                  <p className="text-xs text-muted-foreground">
                    {TIPOS_VEHICULO[p.tipo]} · {p.provincia ?? "—"}
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
                  {p.vehicle_providers?.nombre ?? "—"}
                  <p className="text-xs">{p.vehicle_providers?.tipo === "rentacar" ? "Rent-A-Car" : "Particular"}</p>
                </td>
                <td className="px-4 py-3">{dinero(p.tarifa_dia, p.moneda)}</td>
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
