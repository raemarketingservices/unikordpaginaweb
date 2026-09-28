import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { TarjetaServicio } from "@/components/uniko/Tarjetas";
import { fetchServicios, fetchCategorias } from "@/lib/queries";
import { provincias } from "@/data/marketplace";
import type { Categoria, Servicio } from "@/data/marketplace";

export const Route = createFileRoute("/servicios/")({
  loader: async () => ({
    servicios: await fetchServicios(),
    categorias: await fetchCategorias(),
  }),
  head: () => ({
    meta: [
      { title: "Servicios y profesionales · UNIKO-RD" },
      {
        name: "description",
        content:
          "Contrata plomeros, electricistas, diseñadores, fotógrafos y más profesionales verificados en toda República Dominicana.",
      },
      { property: "og:title", content: "Servicios y profesionales · UNIKO-RD" },
      {
        property: "og:description",
        content: "Encuentra profesionales verificados cerca de ti y pide tu cotización.",
      },
    ],
  }),
  component: Servicios,
});

function Servicios() {
  const { servicios, categorias } = Route.useLoaderData();
  const [categoria, setCategoria] = useState("todas");
  const [provincia, setProvincia] = useState("todas");
  const [soloVerificados, setSoloVerificados] = useState(false);
  const [orden, setOrden] = useState("relevancia");

  const lista = useMemo(() => {
    const filtrada = servicios.filter(
      (s) =>
        (categoria === "todas" || s.categoria === categoria) &&
        (provincia === "todas" || s.ubicacion.includes(provincia)) &&
        (!soloVerificados || s.verificado),
    );
    const copia = [...filtrada];
    if (orden === "precio-asc") copia.sort((a, b) => a.desde - b.desde);
    if (orden === "precio-desc") copia.sort((a, b) => b.desde - a.desde);
    if (orden === "rating") copia.sort((a, b) => b.rating - a.rating);
    return copia;
  }, [servicios, categoria, provincia, soloVerificados, orden]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl sm:text-3xl">Servicios y profesionales</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {lista.length} resultados · Precios en pesos dominicanos (RD$)
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="card-uniko h-fit space-y-5 p-5">
          <Campo label="Categoría">
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="select-uniko w-full"
            >
              <option value="todas">Todas</option>
              {categorias.map((c: Categoria) => (
                <option key={c.slug} value={c.slug}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Ubicación">
            <select
              value={provincia}
              onChange={(e) => setProvincia(e.target.value)}
              className="select-uniko w-full"
            >
              <option value="todas">Toda RD</option>
              {provincias.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Campo>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={soloVerificados}
              onChange={(e) => setSoloVerificados(e.target.checked)}
            />{" "}
            Solo verificados
          </label>
        </aside>

        <div className="min-w-0">
          <div className="mb-4 flex items-center justify-end gap-2">
            <span className="text-sm text-muted-foreground">Ordenar por</span>
            <select
              value={orden}
              onChange={(e) => setOrden(e.target.value)}
              className="select-uniko"
            >
              <option value="relevancia">Relevancia</option>
              <option value="precio-asc">Menor precio</option>
              <option value="precio-desc">Mayor precio</option>
              <option value="rating">Mejor calificados</option>
            </select>
          </div>
          {lista.length ? (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {lista.map((s) => (
                <TarjetaServicio key={s.id} servicio={s} />
              ))}
            </div>
          ) : (
            <p className="card-uniko p-8 text-center text-sm text-muted-foreground">
              No encontramos servicios con esos filtros.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-primary">{label}</p>
      {children}
    </div>
  );
}
