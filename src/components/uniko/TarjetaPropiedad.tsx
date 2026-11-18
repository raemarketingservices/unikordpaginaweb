import { Link } from "@tanstack/react-router";
import { BedDouble, Bath, Car, Home, MapPin, Ruler } from "lucide-react";
import { OPERACIONES, TIPOS, precioTexto, type Propiedad } from "@/lib/propiedades";

export function TarjetaPropiedad({ p }: { p: Propiedad }) {
  return (
    <Link
      to="/propiedades/$propiedadId"
      params={{ propiedadId: p.id }}
      className="card-uniko group block overflow-hidden transition hover:-translate-y-0.5"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {p.fotos[0] ? (
          <img
            src={p.fotos[0]}
            alt={p.titulo}
            loading="lazy"
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center text-muted-foreground">
            <Home className="h-10 w-10" />
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-brand px-3 py-1 text-[11px] font-bold uppercase text-brand-foreground">
          {OPERACIONES[p.operacion]}
        </span>
      </div>
      <div className="grid gap-1.5 p-4">
        <p className="text-lg font-bold text-primary">{precioTexto(p)}</p>
        <h3 className="line-clamp-1 text-sm font-semibold text-foreground">{p.titulo}</h3>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          {[TIPOS[p.tipo], p.sector, p.provincia].filter(Boolean).join(" · ")}
        </p>
        <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {p.habitaciones != null && (
            <span className="flex items-center gap-1">
              <BedDouble className="h-3.5 w-3.5" /> {p.habitaciones}
            </span>
          )}
          {p.banos != null && (
            <span className="flex items-center gap-1">
              <Bath className="h-3.5 w-3.5" /> {p.banos}
            </span>
          )}
          {p.parqueos != null && (
            <span className="flex items-center gap-1">
              <Car className="h-3.5 w-3.5" /> {p.parqueos}
            </span>
          )}
          {p.metros != null && (
            <span className="flex items-center gap-1">
              <Ruler className="h-3.5 w-3.5" /> {p.metros} m²
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
