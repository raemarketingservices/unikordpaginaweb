import { useEffect, useState } from "react";
import { ImageUp } from "lucide-react";

// La portada se pinta con object-cover en la tarjeta (≈3:1) y en la página de la tienda
// (más panorámica); 1500×500 deja margen para ambos recortes.
export const MEDIDA_BANNER = "1500 × 500 px (proporción 3:1), JPG, PNG o WebP, máx. 10 MB";

/** Selector de banner con vista previa y las medidas recomendadas. */
export function CampoBanner({
  actual,
  archivo,
  onArchivo,
}: {
  actual?: string | null | undefined;
  archivo: File | null;
  onArchivo: (f: File | null) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!archivo) {
      setPreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(archivo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [archivo]);
  const src = preview ?? actual ?? null;

  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-bold uppercase tracking-wide text-primary">Banner de la tienda</span>
      <label className="group relative block aspect-[3/1] w-full cursor-pointer overflow-hidden rounded-xl border border-dashed border-border bg-muted hover:border-brand">
        {src ? (
          <img src={src} alt="Vista previa del banner" className="h-full w-full object-cover" />
        ) : (
          <span className="grid h-full place-items-center text-xs font-semibold text-muted-foreground">
            Sin banner
          </span>
        )}
        <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-black/55 py-2 text-xs font-semibold text-white">
          <ImageUp className="h-4 w-4" /> {src ? "Cambiar banner" : "Subir banner"}
        </span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => onArchivo(e.target.files?.[0] ?? null)}
        />
      </label>
      <span className="text-[11px] text-muted-foreground">
        Medida recomendada: {MEDIDA_BANNER}. Deja lo importante en el centro: los bordes pueden
        recortarse en celulares.
      </span>
    </div>
  );
}
