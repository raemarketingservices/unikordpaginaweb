import { BadgeCheck, Star } from "lucide-react";
import type { ReactNode } from "react";

export function BadgeVerificado({ texto = "Verificado" }: { texto?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
      <BadgeCheck className="h-4 w-4 shrink-0" />
      {texto}
    </span>
  );
}

export function Estrellas({ rating, resenas }: { rating: number; resenas: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
      <Star className="h-3.5 w-3.5 shrink-0 fill-brand text-brand" />
      <span className="font-semibold text-foreground">{rating.toFixed(1)}</span>
      <span>({resenas})</span>
    </span>
  );
}

export function Etiqueta({
  children,
  tono = "brand",
}: {
  children: ReactNode;
  tono?: "brand" | "primary" | "neutro";
}) {
  const tonos = {
    brand: "bg-brand text-brand-foreground",
    primary: "bg-primary text-primary-foreground",
    neutro: "bg-muted text-muted-foreground",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${tonos[tono]}`}
    >
      {children}
    </span>
  );
}

export function TituloSeccion({
  titulo,
  descripcion,
  accion,
}: {
  titulo: string;
  descripcion?: string | undefined;
  accion?: ReactNode | undefined;
}) {
  return (
    <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
      <div className="min-w-0">
        <h2 className="text-xl font-bold sm:text-2xl">{titulo}</h2>
        {descripcion ? <p className="mt-1 text-sm text-muted-foreground">{descripcion}</p> : null}
      </div>
      {accion}
    </div>
  );
}
