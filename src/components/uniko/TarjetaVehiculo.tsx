import { Link } from "@tanstack/react-router";
import { Car, Fuel, Gauge, MapPin, Settings2, Users } from "lucide-react";
import { COMBUSTIBLES, TIPOS_VEHICULO, dinero, nombreVehiculo, type Vehiculo } from "@/lib/vehiculos";

export function TarjetaVehiculo({ v }: { v: Vehiculo }) {
  return (
    <Link
      to="/vehiculos/$vehiculoId"
      params={{ vehiculoId: v.id }}
      className="card-uniko group block overflow-hidden transition hover:-translate-y-0.5"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {v.fotos[0] ? (
          <img
            src={v.fotos[0]}
            alt={nombreVehiculo(v)}
            loading="lazy"
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center text-muted-foreground">
            <Car className="h-10 w-10" />
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-[11px] font-bold uppercase text-primary-foreground">
          {v.vehicle_providers?.tipo === "particular" ? "Particular" : "Rent-A-Car"}
        </span>
      </div>
      <div className="grid gap-1.5 p-4">
        <p className="text-lg font-bold text-primary">
          {dinero(v.tarifa_dia, v.moneda)} <span className="text-xs font-semibold text-muted-foreground">/ día</span>
        </p>
        <h3 className="line-clamp-1 text-sm font-semibold text-foreground">{nombreVehiculo(v)}</h3>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          {[TIPOS_VEHICULO[v.tipo], v.color, v.provincia].filter(Boolean).join(" · ")}
        </p>
        <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> {v.pasajeros}
          </span>
          <span className="flex items-center gap-1">
            <Settings2 className="h-3.5 w-3.5" /> {v.transmision === "manual" ? "Manual" : "Automática"}
          </span>
          <span className="flex items-center gap-1">
            <Fuel className="h-3.5 w-3.5" /> {COMBUSTIBLES[v.combustible]}
          </span>
          {v.kilometraje != null && (
            <span className="flex items-center gap-1">
              <Gauge className="h-3.5 w-3.5" /> {v.kilometraje.toLocaleString("es-DO")} km
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
