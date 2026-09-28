import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Search, X, MapPin, ChevronDown } from "lucide-react";
import { TarjetaProducto, TarjetaServicio } from "@/components/uniko/Tarjetas";
import { TituloSeccion } from "@/components/uniko/Primitivos";
import { fetchProductos, fetchServicios } from "@/lib/queries";
import { provincias } from "@/data/marketplace";

export const Route = createFileRoute("/buscar")({
  validateSearch: (s) => {
    const x = s as Record<string, unknown>;
    const q = typeof x["q"] === "string" ? x["q"] : "";
    const ubicacion = typeof x["ubicacion"] === "string" ? x["ubicacion"] : "todas";
    return { q, ubicacion };
  },
  loader: async () => ({
    productos: await fetchProductos(),
    servicios: await fetchServicios(),
  }),
  head: ({ match }) => ({
    meta: [
      { title: match.search.q ? `Buscar "${match.search.q}" · UNIKO-RD` : "Buscar · UNIKO-RD" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Buscar,
});

function Buscar() {
  const { productos, servicios } = Route.useLoaderData();
  const { q, ubicacion } = Route.useSearch();
  const navigate = Route.useNavigate();

  const buscar = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    navigate({
      to: "/buscar",
      search: { q: fd.get("q") as string, ubicacion: fd.get("ubicacion") as string },
    });
  };

  const limpiar = () => navigate({ to: "/buscar", search: { q: "", ubicacion: "todas" } });

  const productosFiltrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    return productos.filter((p) => {
      const coincide =
        !t ||
        p.titulo.toLowerCase().includes(t) ||
        p.tienda.toLowerCase().includes(t) ||
        p.categoria.toLowerCase().includes(t) ||
        p.ubicacion.toLowerCase().includes(t);
      const zona = ubicacion === "todas" || p.ubicacion.includes(ubicacion);
      return coincide && zona;
    });
  }, [productos, q, ubicacion]);

  const serviciosFiltrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    return servicios.filter((s) => {
      const coincide =
        !t ||
        s.titulo.toLowerCase().includes(t) ||
        s.proveedor.toLowerCase().includes(t) ||
        s.categoria.toLowerCase().includes(t) ||
        s.ubicacion.toLowerCase().includes(t);
      const zona = ubicacion === "todas" || s.ubicacion.includes(ubicacion);
      return coincide && zona;
    });
  }, [servicios, q, ubicacion]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <form onSubmit={buscar} className="card-uniko p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              name="q"
              value={q}
              onChange={(e) => e.target.value}
              placeholder="¿Qué buscas? (productos, servicios, tiendas, ubicaciones)"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
            {q && (
              <button
                type="button"
                onClick={limpiar}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </label>
          <select
            name="ubicacion"
            value={ubicacion}
            onChange={(e) => e.target.value}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="todas">Toda RD</option>
            {provincias.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-base btn-brand shrink-0">
            Buscar
          </button>
        </div>
      </form>

      <div className="mt-6 grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="card-uniko h-fit p-5 space-y-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Filtros activos
          </p>
          {q && (
            <div className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-1 text-xs">
              <span className="font-semibold">q:</span> {q}
            </div>
          )}
          {ubicacion !== "todas" && (
            <div className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-1 text-xs">
              <MapPin className="h-3 w-3" />
              {ubicacion}
            </div>
          )}
        </aside>

        <div className="min-w-0">
          <div className="mb-4 flex items-center justify-between">
            <TituloSeccion
              titulo={`Resultados para "${q || "todo"}"`}
              descripcion={`${productosFiltrados.length} productos · ${serviciosFiltrados.length} servicios`}
            />
          </div>

          {productosFiltrados.length ? (
            <div>
              <TituloSeccion titulo="Productos" />
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {productosFiltrados.map((p) => (
                  <TarjetaProducto key={p.id} producto={p} />
                ))}
              </div>
            </div>
          ) : null}

          {serviciosFiltrados.length ? (
            <div className="mt-8">
              <TituloSeccion titulo="Servicios" />
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {serviciosFiltrados.map((s) => (
                  <TarjetaServicio key={s.id} servicio={s} />
                ))}
              </div>
            </div>
          ) : null}

          {!productosFiltrados.length && !serviciosFiltrados.length && (
            <p className="card-uniko p-8 text-center text-sm text-muted-foreground">
              No encontramos resultados con esos filtros.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
