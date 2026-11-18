import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { differenceInCalendarDays, format, startOfToday } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowLeft,
  CalendarDays,
  Car,
  Check,
  DoorOpen,
  Fuel,
  Gauge,
  Mail,
  MapPin,
  MessageCircle,
  Palette,
  Phone,
  Settings2,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { enlaceWhatsapp } from "@/lib/propiedades";
import { COMBUSTIBLES, TIPOS_VEHICULO, dinero, fetchVehiculo, nombreVehiculo } from "@/lib/vehiculos";

export const Route = createFileRoute("/vehiculos/$vehiculoId")({
  loader: async ({ params }) => {
    const vehiculo = await fetchVehiculo(params.vehiculoId);
    if (!vehiculo) throw notFound();
    return { vehiculo };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `Renta ${nombreVehiculo(loaderData.vehiculo)} · ${dinero(loaderData.vehiculo.tarifa_dia, loaderData.vehiculo.moneda)}/día · UNIKO-RD`
          : "Vehículo no encontrado · UNIKO-RD",
      },
    ],
  }),
  notFoundComponent: () => (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-xl">Vehículo no encontrado</h1>
      <Link to="/vehiculos" className="btn-base btn-brand mt-4">
        Ver vehículos
      </Link>
    </div>
  ),
  component: DetalleVehiculo,
});

function DetalleVehiculo() {
  const { vehiculo: v } = Route.useLoaderData();
  const [foto, setFoto] = useState(0);
  const [rango, setRango] = useState<DateRange | undefined>();
  const prov = v.vehicle_providers;

  // Se cobra por día calendario: del 10 al 13 son 3 días; mismo día = 1.
  const dias =
    rango?.from && rango.to ? Math.max(1, differenceInCalendarDays(rango.to, rango.from)) : rango?.from ? 1 : 0;
  const total = dias * v.tarifa_dia;
  const fecha = (d: Date) => format(d, "EEE d 'de' MMM yyyy", { locale: es });
  const url = typeof window !== "undefined" ? window.location.href : "";
  const mensaje = rango?.from
    ? `Hola, quiero rentar el ${nombreVehiculo(v)} que vi en UNIKO-RD del ${fecha(rango.from)} al ${fecha(rango.to ?? rango.from)} (${dias} ${dias === 1 ? "día" : "días"}, total ${dinero(total, v.moneda)}). ¿Está disponible? ${url}`
    : `Hola, me interesa rentar el ${nombreVehiculo(v)} que vi en UNIKO-RD: ${url}`;

  const ficha = [
    { icono: Users, texto: `${v.pasajeros} pasajeros` },
    { icono: Settings2, texto: v.transmision === "manual" ? "Manual" : "Automática" },
    { icono: Fuel, texto: COMBUSTIBLES[v.combustible] },
    v.kilometraje != null && { icono: Gauge, texto: `${v.kilometraje.toLocaleString("es-DO")} km` },
    v.color && { icono: Palette, texto: v.color },
    v.puertas != null && { icono: DoorOpen, texto: `${v.puertas} puertas` },
  ].filter(Boolean) as { icono: typeof Users; texto: string }[];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Link to="/vehiculos" className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
        <ArrowLeft className="h-4 w-4" /> Volver a vehículos
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
            {v.fotos[foto] ? (
              <img src={v.fotos[foto]} alt={nombreVehiculo(v)} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-muted-foreground">
                <Car className="h-12 w-12" />
              </div>
            )}
          </div>
          {v.fotos.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {v.fotos.map((f, i) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFoto(i)}
                  aria-label={`Ver foto ${i + 1}`}
                  className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 ${i === foto ? "border-brand" : "border-transparent"}`}
                >
                  <img src={f} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <section className="card-uniko mt-6 p-5">
            <h2 className="text-lg">Ficha del vehículo</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ficha.map(({ icono: Icono, texto }) => (
                <div key={texto} className="flex items-center gap-2 rounded-xl bg-muted/50 p-3 text-sm">
                  <Icono className="h-4 w-4 text-primary" /> {texto}
                </div>
              ))}
            </div>
          </section>
          {v.extras.length > 0 && (
            <section className="card-uniko mt-4 p-5">
              <h2 className="text-lg">Incluye</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {v.extras.map((x) => (
                  <li key={x} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success" /> {x}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {v.descripcion && (
            <section className="card-uniko mt-4 p-5">
              <h2 className="text-lg">Detalles y condiciones</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {v.descripcion}
              </p>
            </section>
          )}
        </div>

        <aside className="grid h-fit gap-4">
          <div className="card-uniko p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-primary">
              {TIPOS_VEHICULO[v.tipo]}
            </p>
            <h1 className="mt-1 text-2xl">{nombreVehiculo(v)}</h1>
            <p className="mt-2 text-3xl font-bold text-primary">
              {dinero(v.tarifa_dia, v.moneda)}
              <span className="text-sm font-semibold text-muted-foreground"> / día</span>
            </p>
            {v.provincia && (
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" /> {v.provincia}
              </p>
            )}
            {v.deposito != null && v.deposito > 0 && (
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4" /> Depósito: {dinero(v.deposito, v.moneda)}
              </p>
            )}

            <div className="mt-5">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary">
                <CalendarDays className="h-4 w-4" /> Elige tus fechas
              </p>
              <div className="mt-2 flex justify-center rounded-xl border border-border">
                <Calendar
                  mode="range"
                  locale={es}
                  selected={rango}
                  onSelect={setRango}
                  disabled={{ before: startOfToday() }}
                  numberOfMonths={1}
                />
              </div>
              <div className="mt-3 rounded-xl bg-muted/50 p-3 text-sm">
                {dias ? (
                  <>
                    <p>
                      {fecha(rango!.from!)} → {fecha(rango!.to ?? rango!.from!)}
                    </p>
                    <p className="mt-1 flex justify-between">
                      <span>
                        {dinero(v.tarifa_dia, v.moneda)} × {dias} {dias === 1 ? "día" : "días"}
                      </span>
                      <strong className="text-primary">{dinero(total, v.moneda)}</strong>
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground">Toca el día de recogida y el de entrega.</p>
                )}
              </div>
            </div>
          </div>

          {prov && (
            <div className="card-uniko p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-primary">
                {prov.tipo === "rentacar" ? "Rent-A-Car" : "Dueño particular"}
              </p>
              <div className="mt-3 flex items-center gap-3">
                {prov.logo ? (
                  <img src={prov.logo} alt="" className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-muted">
                    <UserRound className="h-6 w-6 text-muted-foreground" />
                  </span>
                )}
                <p className="min-w-0 truncate font-bold">{prov.nombre}</p>
              </div>
              <div className="mt-4 grid gap-2">
                {(prov.whatsapp || prov.telefono) && (
                  <a
                    href={enlaceWhatsapp(prov.whatsapp || prov.telefono || "", mensaje)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-base btn-brand w-full"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {dias ? `Reservar ${dias} ${dias === 1 ? "día" : "días"} por WhatsApp` : "Escribir por WhatsApp"}
                  </a>
                )}
                {prov.telefono && (
                  <a href={`tel:${prov.telefono}`} className="btn-base btn-outline w-full">
                    <Phone className="h-4 w-4" /> Llamar
                  </a>
                )}
                {prov.email && (
                  <a
                    href={`mailto:${prov.email}?subject=${encodeURIComponent(`Renta ${nombreVehiculo(v)}`)}&body=${encodeURIComponent(mensaje)}`}
                    className="btn-base btn-outline w-full"
                  >
                    <Mail className="h-4 w-4" /> Enviar correo
                  </a>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
