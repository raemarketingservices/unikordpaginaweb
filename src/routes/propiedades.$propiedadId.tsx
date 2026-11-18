import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Building2,
  Car,
  Check,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Ruler,
  UserRound,
} from "lucide-react";
import {
  OPERACIONES,
  TIPOS,
  enlaceWhatsapp,
  fetchPropiedad,
  precioTexto,
} from "@/lib/propiedades";

export const Route = createFileRoute("/propiedades/$propiedadId")({
  loader: async ({ params }) => {
    const propiedad = await fetchPropiedad(params.propiedadId);
    if (!propiedad) throw notFound();
    return { propiedad };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `${loaderData.propiedad.titulo} · ${precioTexto(loaderData.propiedad)} · UNIKO-RD`
          : "Propiedad no encontrada · UNIKO-RD",
      },
    ],
  }),
  notFoundComponent: () => (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-xl">Propiedad no encontrada</h1>
      <Link to="/propiedades" className="btn-base btn-brand mt-4">
        Ver propiedades
      </Link>
    </div>
  ),
  component: DetallePropiedad,
});

function DetallePropiedad() {
  const { propiedad: p } = Route.useLoaderData();
  const [foto, setFoto] = useState(0);
  const agente = p.property_agents;
  const url = typeof window !== "undefined" ? window.location.href : "";
  const mensaje = `Hola, me interesa la propiedad «${p.titulo}» (${precioTexto(p)}) que vi en UNIKO-RD: ${url}`;

  const datos = [
    { icono: BedDouble, valor: p.habitaciones, etiqueta: "habitaciones" },
    { icono: Bath, valor: p.banos, etiqueta: "baños" },
    { icono: Car, valor: p.parqueos, etiqueta: "parqueos" },
    { icono: Ruler, valor: p.metros, etiqueta: "m²" },
  ].filter((d) => d.valor != null);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Link to="/propiedades" className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
        <ArrowLeft className="h-4 w-4" /> Volver a propiedades
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
            {p.fotos[foto] ? (
              <img src={p.fotos[foto]} alt={p.titulo} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-muted-foreground">
                <Building2 className="h-12 w-12" />
              </div>
            )}
          </div>
          {p.fotos.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {p.fotos.map((f, i) => (
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

          {p.descripcion && (
            <section className="card-uniko mt-6 p-5">
              <h2 className="text-lg">Descripción</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {p.descripcion}
              </p>
            </section>
          )}
          {p.amenidades.length > 0 && (
            <section className="card-uniko mt-4 p-5">
              <h2 className="text-lg">Comodidades</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {p.amenidades.map((a) => (
                  <li key={a} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success" /> {a}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="grid h-fit gap-4">
          <div className="card-uniko p-5">
            <span className="rounded-full bg-brand px-3 py-1 text-[11px] font-bold uppercase text-brand-foreground">
              {OPERACIONES[p.operacion]}
            </span>
            <h1 className="mt-3 text-2xl">{p.titulo}</h1>
            <p className="mt-2 text-3xl font-bold text-primary">{precioTexto(p)}</p>
            <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {[TIPOS[p.tipo], p.sector, p.provincia].filter(Boolean).join(" · ")}
            </p>
            {datos.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {datos.map(({ icono: Icono, valor, etiqueta }) => (
                  <div key={etiqueta} className="flex items-center gap-2 rounded-xl bg-muted/50 p-3 text-sm">
                    <Icono className="h-4 w-4 text-primary" />
                    <span className="font-bold">{valor}</span> {etiqueta}
                  </div>
                ))}
              </div>
            )}
            {p.lat != null && p.lng != null && (
              <a
                href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=17/${p.lat}/${p.lng}`}
                target="_blank"
                rel="noreferrer"
                className="btn-base btn-outline mt-4 w-full"
              >
                <MapPin className="h-4 w-4" /> Ver ubicación en el mapa
              </a>
            )}
          </div>

          {agente && (
            <div className="card-uniko p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-primary">
                {agente.tipo === "inmobiliaria" ? "Inmobiliaria" : "Agente inmobiliario"}
              </p>
              <div className="mt-3 flex items-center gap-3">
                {agente.logo ? (
                  <img src={agente.logo} alt="" className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-muted">
                    <UserRound className="h-6 w-6 text-muted-foreground" />
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate font-bold">{agente.nombre}</p>
                  {agente.licencia && (
                    <p className="text-xs text-muted-foreground">Licencia: {agente.licencia}</p>
                  )}
                </div>
              </div>
              <div className="mt-4 grid gap-2">
                {(agente.whatsapp || agente.telefono) && (
                  <a
                    href={enlaceWhatsapp(agente.whatsapp || agente.telefono || "", mensaje)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-base btn-brand w-full"
                  >
                    <MessageCircle className="h-4 w-4" /> Escribir por WhatsApp
                  </a>
                )}
                {agente.telefono && (
                  <a href={`tel:${agente.telefono}`} className="btn-base btn-outline w-full">
                    <Phone className="h-4 w-4" /> Llamar
                  </a>
                )}
                {agente.email && (
                  <a
                    href={`mailto:${agente.email}?subject=${encodeURIComponent(p.titulo)}&body=${encodeURIComponent(mensaje)}`}
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
