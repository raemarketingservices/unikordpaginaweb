import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Building2, KeyRound, Plus } from "lucide-react";
import { TarjetaPropiedad } from "@/components/uniko/TarjetaPropiedad";
import { MapaMarketplace, type PuntoMapa } from "@/components/uniko/Mapa";
import { ESLOGAN, OPERACIONES, TIPOS, fetchPropiedades, precioTexto } from "@/lib/propiedades";
import { provincias } from "@/data/marketplace";

export const Route = createFileRoute("/propiedades/")({
  loader: async () => ({ propiedades: await fetchPropiedades() }),
  head: () => ({
    meta: [
      { title: `${ESLOGAN} · Propiedades en venta y alquiler · UNIKO-RD` },
      {
        name: "description",
        content:
          "Casas, apartamentos, villas, solares y locales en venta y alquiler en toda República Dominicana. Publica tu propiedad como inmobiliaria o agente.",
      },
      { property: "og:title", content: `${ESLOGAN} · UNIKO-RD` },
    ],
  }),
  component: Propiedades,
});

function Propiedades() {
  const { propiedades } = Route.useLoaderData();
  const [operacion, setOperacion] = useState<string>("todas");
  const [tipo, setTipo] = useState("todos");
  const [provincia, setProvincia] = useState("todas");
  const [habitaciones, setHabitaciones] = useState(0);
  const [precioMax, setPrecioMax] = useState("");

  const lista = useMemo(
    () =>
      propiedades.filter(
        (p) =>
          (operacion === "todas" || p.operacion === operacion) &&
          (tipo === "todos" || p.tipo === tipo) &&
          (provincia === "todas" || p.provincia === provincia) &&
          (p.habitaciones ?? 0) >= habitaciones &&
          (!precioMax || p.precio <= Number(precioMax)),
      ),
    [propiedades, operacion, tipo, provincia, habitaciones, precioMax],
  );

  const puntos: PuntoMapa[] = lista
    .filter((p) => p.lat != null && p.lng != null)
    .map((p) => ({
      id: p.id,
      nombre: `${p.titulo} · ${precioTexto(p)}`,
      tipo: "propiedad",
      provincia: p.provincia ?? "",
      detalle: OPERACIONES[p.operacion],
      lat: p.lat as number,
      lng: p.lng as number,
    }));

  return (
    <div>
      <section className="border-b border-border bg-gradient-to-b from-accent/60 to-background">
        <div className="mx-auto max-w-7xl px-4 py-10 lg:py-14">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary">
            <KeyRound className="h-4 w-4" /> Bienes raíces en República Dominicana
          </p>
          <h1 className="mt-2 text-3xl leading-tight sm:text-4xl lg:text-5xl">{ESLOGAN}</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Compra, vende o alquila casas, apartamentos, villas y locales. Contacta directo con
            inmobiliarias y agentes de todo el país.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {(["todas", ...Object.keys(OPERACIONES)] as string[]).map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOperacion(o)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  operacion === o
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-background hover:bg-accent"
                }`}
              >
                {o === "todas" ? "Todas" : OPERACIONES[o as keyof typeof OPERACIONES]}
              </button>
            ))}
            <Link to="/propiedades/publicar" className="btn-base btn-brand ml-auto">
              <Plus className="h-4 w-4" /> Publica tu propiedad
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="card-uniko grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wide text-primary">
            Tipo
            <select className="select-uniko" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="todos">Todos</option>
              {Object.entries(TIPOS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wide text-primary">
            Provincia
            <select className="select-uniko" value={provincia} onChange={(e) => setProvincia(e.target.value)}>
              <option value="todas">Todas</option>
              {provincias.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wide text-primary">
            Habitaciones (mínimo)
            <select
              className="select-uniko"
              value={habitaciones}
              onChange={(e) => setHabitaciones(Number(e.target.value))}
            >
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n === 0 ? "Cualquiera" : `${n}+`}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wide text-primary">
            Precio máximo
            <input
              className="input-uniko"
              inputMode="numeric"
              placeholder="Sin límite"
              value={precioMax}
              onChange={(e) => setPrecioMax(e.target.value.replace(/\D/g, ""))}
            />
          </label>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">{lista.length} propiedades</p>
        {lista.length ? (
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {lista.map((p) => (
              <TarjetaPropiedad key={p.id} p={p} />
            ))}
          </div>
        ) : (
          <div className="card-uniko mt-3 grid place-items-center gap-3 p-10 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Aún no hay propiedades con esos filtros. ¿Eres inmobiliaria o agente?
            </p>
            <Link to="/propiedades/publicar" className="btn-base btn-brand">
              Publica la primera
            </Link>
          </div>
        )}
      </div>

      <MapaMarketplace
        puntos={puntos}
        titulo="Propiedades cerca de mí"
        resumen="propiedades en el mapa"
        leyenda="Naranja: propiedades."
      />
    </div>
  );
}
