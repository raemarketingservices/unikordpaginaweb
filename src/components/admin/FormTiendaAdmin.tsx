import { useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { slugUnico, subirImagen } from "@/lib/queries";
import { provincias } from "@/data/marketplace";
import { SelectorUbicacion, type Punto } from "@/components/uniko/Mapa";
import type { StoreRow } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Alta o edición de una tienda por el administrador (sin dueño si la crea él). */
export function FormTiendaAdmin({
  tienda,
  abierto,
  onCerrar,
  onGuardada,
}: {
  tienda: StoreRow | null;
  abierto: boolean;
  onCerrar: () => void;
  onGuardada: (t: StoreRow) => void;
}) {
  const [nombre, setNombre] = useState(tienda?.name ?? "");
  const [categoria, setCategoria] = useState(tienda?.category ?? "");
  const [provincia, setProvincia] = useState(tienda?.location ?? "");
  const [descripcion, setDescripcion] = useState(tienda?.description ?? "");
  const [rnc, setRnc] = useState(tienda?.rnc ?? "");
  const [logo, setLogo] = useState<File | null>(null);
  const [punto, setPunto] = useState<Punto | null>(
    tienda?.lat != null && tienda.lng != null ? { lat: tienda.lat, lng: tienda.lng } : null,
  );
  const [guardando, setGuardando] = useState(false);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardando) return;
    if (nombre.trim().length < 2) return void toast.error("Escribe el nombre de la tienda.");
    setGuardando(true);
    try {
      const { data: sesion } = await supabase.auth.getSession();
      const logoUrl = logo ? await subirImagen(logo, sesion.session?.user.id ?? "admin") : undefined;
      const campos = {
        name: nombre.trim(),
        category: categoria.trim() || null,
        location: provincia || null,
        description: descripcion.trim() || null,
        rnc: rnc.trim() || null,
        lat: punto?.lat ?? null,
        lng: punto?.lng ?? null,
        ...(logoUrl ? { logo: logoUrl, cover: tienda?.cover ?? logoUrl } : {}),
      };
      const res = tienda
        ? await supabase.from("stores").update(campos).eq("id", tienda.id).select().single()
        : await supabase
            .from("stores")
            .insert({ id: slugUnico(nombre), owner_id: null, approved: true, ...campos })
            .select()
            .single();
      if (res.error) throw new Error(res.error.message);
      toast.success(tienda ? "Tienda actualizada." : "Tienda creada y publicada.");
      onGuardada(res.data as StoreRow);
      onCerrar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar la tienda.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{tienda ? `Editar “${tienda.name}”` : "Nueva tienda"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={guardar} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Nombre">
              <input className="input-uniko" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </Campo>
            <Campo label="Categoría">
              <input className="input-uniko" value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Ej: Tecnología" />
            </Campo>
            <Campo label="Provincia">
              <select className="select-uniko" value={provincia} onChange={(e) => setProvincia(e.target.value)}>
                <option value="">Selecciona…</option>
                {provincias.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="RNC (opcional)">
              <input className="input-uniko" value={rnc} onChange={(e) => setRnc(e.target.value)} />
            </Campo>
          </div>
          <Campo label="Descripción">
            <textarea className="input-uniko min-h-20" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={600} />
          </Campo>
          <Campo label="Logo">
            <span className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border px-3 py-3 text-xs font-semibold text-muted-foreground hover:border-brand hover:text-brand">
              <Upload className="h-4 w-4" />
              {logo ? logo.name : tienda?.logo ? "Cambiar logo" : "Subir logo (PNG o JPG)"}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} />
            </span>
          </Campo>
          <div className="grid gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-primary">Ubicación en el mapa</span>
            <SelectorUbicacion value={punto} onChange={setPunto} />
          </div>
          <button type="submit" disabled={guardando} className="btn-base btn-brand">
            {guardando ? "Guardando…" : tienda ? "Guardar cambios" : "Crear tienda"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
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
