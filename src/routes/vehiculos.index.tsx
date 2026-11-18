import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Car, CarFront, Plus } from "lucide-react";
import { TarjetaVehiculo } from "@/components/uniko/TarjetaVehiculo";
import { MapaMarketplace, type PuntoMapa } from "@/components/uniko/Mapa";
import { ESLOGAN_AUTOS, TIPOS_VEHICULO, dinero, fetchVehiculos, nombreVehiculo } from "@/lib/vehiculos";
import { provincias } from "@/data/marketplace";

export const Route = createFileRoute("/vehiculos/")({
  loader: async () => ({ vehiculos: await fetchVehiculos() }),
  head: () => ({
    meta: [
      { title: `${ESLOGAN_AUTOS} · Renta de vehículos · UNIKO-RD` },
      {
        name: "description",
        content:
          "Renta carros, jeepetas, minivans y motores por día en toda República Dominicana. Rent-A-Car y particulares publican en UNIKO-RD.",
      },
      { property: "og:title", content: `${ESLOGAN_AUTOS} · UNIKO-RD` },
    ],
  }),
  component: Vehiculos,
});

function Vehiculos() {
  const { vehiculos } = Route.useLoaderData();
  const [tipo, setTipo] = useState("todos");
  const [provincia, setProvincia] = useState("todas");
  const [pasajeros, setPasajeros] = useState(0);
  const [transmision, setTransmision] = useState("todas");
  const [proveedor, setProveedor] = useState("todos");
  const [tarifaMax, setTarifaMax] = useState("");

  const lista = useMemo(
    () =>
      vehiculos.filter(
        (v) =>
          (tipo === "todos" || v.tipo === tipo) &&
          (provincia === "todas" || v.provincia === provincia) &&
          v.pasajeros >= pasajeros &&
          (transmision === "todas" || v.transmision === transmision) &&
          (proveedor === "todos" || v.vehicle_providers?.tipo === proveedor) &&
          (!tarifaMax || v.tarifa_dia <= Number(tarifaMax)),
      ),
    [vehiculos, tipo, provincia, pasajeros, transmision, proveedor, tarifaMax],
  );

  const puntos: PuntoMapa[] = lista
    .filter((v) => v.lat != null && v.lng != null)
    .map((v) => ({
      id: v.id,
      nombre: `${nombreVehiculo(v)} · ${dinero(v.tarifa_dia, v.moneda)}/día`,
      tipo: "vehiculo",
      provincia: v.provincia ?? "",
      detalle: TIPOS_VEHICULO[v.tipo],
      lat: v.lat as number,
      lng: v.lng as number,
    }));

  const filtro = "grid gap-1.5 text-xs font-bold uppercase tracking-wide text-primary";

  return (
    <div>
      <section className="border-b border-border bg-gradient-to-b from-accent/60 to-background">
        <div className="mx-auto max-w-7xl px-4 py-10 lg:py-14">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary">
            <CarFront className="h-4 w-4" /> Renta de vehículos en República Dominicana
          </p>
          <h1 className="mt-2 text-3xl leading-tight sm:text-4xl lg:text-5xl">{ESLOGAN_AUTOS}</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Carros, jeepetas, minivans y motores por día. Elige tus fechas y reserva directo con el
            Rent-A-Car o el dueño.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {(
              [
                ["todos", "Todos"],
                ["rentacar", "Rent-A-Car"],
                ["particular", "Particulares"],
              ] as const
            ).map(([valor, texto]) => (
              <button
                key={valor}
                type="button"
                onClick={() => setProveedor(valor)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  proveedor === valor
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-background hover:bg-accent"
                }`}
              >
                {texto}
              </button>
            ))}
            <Link to="/vehiculos/publicar" className="btn-base btn-brand ml-auto">
              <Plus className="h-4 w-4" /> Pon tu vehículo a rentar
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="card-uniko grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className={filtro}>
            Tipo
            <select className="select-uniko" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="todos">Todos</option>
              {Object.entries(TIPOS_VEHICULO).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className={filtro}>
            Provincia
            <select className="select-uniko" value={provincia} onChange={(e) => setProvincia(e.target.value)}>
              <option value="todas">Todas</option>
              {provincias.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className={filtro}>
            Pasajeros (mínimo)
            <select className="select-uniko" value={pasajeros} onChange={(e) => setPasajeros(Number(e.target.value))}>
              {[0, 2, 4, 5, 7, 8, 12].map((n) => (
                <option key={n} value={n}>
                  {n === 0 ? "Cualquiera" : `${n}+`}
                </option>
              ))}
            </select>
          </label>
          <label className={filtro}>
            Transmisión
            <select className="select-uniko" value={transmision} onChange={(e) => setTransmision(e.target.value)}>
              <option value="todas">Todas</option>
              <option value="automatica">Automática</option>
              <option value="manual">Manual</option>
            </select>
          </label>
          <label className={filtro}>
            Tarifa máx. por día
            <input
              className="input-uniko"
              inputMode="numeric"
              placeholder="Sin límite"
              value={tarifaMax}
              onChange={(e) => setTarifaMax(e.target.value.replace(/\D/g, ""))}
            />
          </label>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">{lista.length} vehículos</p>
        {lista.length ? (
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {lista.map((v) => (
              <TarjetaVehiculo key={v.id} v={v} />
            ))}
          </div>
        ) : (
          <div className="card-uniko mt-3 grid place-items-center gap-3 p-10 text-center">
            <Car className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No hay vehículos con esos filtros.</p>
            <Link to="/vehiculos/publicar" className="btn-base btn-brand">
              Publica el tuyo
            </Link>
          </div>
        )}
      </div>

      <MapaMarketplace
        puntos={puntos}
        titulo="Vehículos cerca de mí"
        resumen="vehículos en el mapa"
        leyenda="Morado: vehículos."
      />
    </div>
  );
}
