import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, Store, Briefcase, ArrowLeft, MapPin } from "lucide-react";
import { TarjetaProducto, TarjetaServicio, TarjetaTienda } from "@/components/uniko/Tarjetas";
import { TituloSeccion } from "@/components/uniko/Primitivos";
import { IconoCategoria } from "@/components/uniko/Categorias";
import { fetchCategorias, fetchProductos, fetchServicios, fetchTiendas } from "@/lib/queries";
import { provincias } from "@/data/marketplace";

export const Route = createFileRoute("/categorias/$categoriaSlug")({
  loader: async ({ params }) => {
    const [categorias, productos, servicios, tiendas] = await Promise.all([
      fetchCategorias(),
      fetchProductos(),
      fetchServicios(),
      fetchTiendas(),
    ]);
    const cat = categorias.find((c) => c.slug === params.categoriaSlug);
    if (!cat) throw notFound();
    return { categoria: cat, productos, servicios, tiendas };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.categoria.nombre ?? "Categoría"} · UNIKO-RD` },
      {
        name: "description",
        content: `Explora ${loaderData?.categoria.nombre.toLowerCase() ?? "esta categoría"} en UNIKO-RD: productos, servicios y tiendas.`,
      },
    ],
  }),
  component: CategoriaDetalle,
});

function CategoriaDetalle() {
  const { categoria, productos, servicios, tiendas } = Route.useLoaderData();
  const [provincia, setProvincia] = useState("todas");
  const [soloVerificados, setSoloVerificados] = useState(false);

  const productosFiltrados = useMemo(
    () =>
      productos.filter(
        (p) =>
          p.categoria === categoria.slug &&
          (provincia === "todas" || p.ubicacion.includes(provincia)) &&
          (!soloVerificados || p.verificado),
      ),
    [productos, categoria.slug, provincia, soloVerificados],
  );

  const serviciosFiltrados = useMemo(
    () =>
      servicios.filter(
        (s) =>
          s.categoria === categoria.slug &&
          (provincia === "todas" || s.ubicacion.includes(provincia)) &&
          (!soloVerificados || s.verificado),
      ),
    [servicios, categoria.slug, provincia, soloVerificados],
  );

  const tiendasFiltradas = useMemo(
    () =>
      tiendas.filter(
        (t) =>
          (t.categoria === categoria.nombre ||
            t.categoria?.toLowerCase().includes(categoria.nombre.toLowerCase())) &&
          (provincia === "todas" || t.ubicacion.includes(provincia)),
      ),
    [tiendas, categoria.nombre, provincia],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link to="/categorias" className="btn-base btn-ghost">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
        <div className="flex items-center gap-3">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-accent text-primary">
            <IconoCategoria nombre={categoria.icono} className="h-7 w-7" />
          </span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{categoria.nombre}</h1>
            <p className="text-sm text-muted-foreground">
              {productosFiltrados.length} productos · {serviciosFiltrados.length} servicios ·{" "}
              {tiendasFiltradas.length} tiendas
            </p>
          </div>
        </div>
      </div>

      <div className="card-uniko p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="h-4 w-4" />
            <select
              value={provincia}
              onChange={(e) => setProvincia(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="todas">Toda RD</option>
              {provincias.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={soloVerificados}
              onChange={(e) => setSoloVerificados(e.target.checked)}
            />
            Solo verificados
          </label>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="card-uniko h-fit p-5 space-y-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Filtros</p>
          {provincia !== "todas" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-1 text-xs">
              <MapPin className="h-3 w-3" /> {provincia}
            </span>
          )}
          {soloVerificados && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-1 text-xs text-primary">
              Solo verificados
            </span>
          )}
        </aside>

        <div className="min-w-0">
          {productosFiltrados.length ? (
            <div>
              <TituloSeccion
                titulo="Productos"
                accion={
                  <Link
                    to="/productos"
                    search={{ categoria: categoria.slug }}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
                  >
                    Ver todos <ArrowRight className="h-4 w-4" />
                  </Link>
                }
              />
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {productosFiltrados.slice(0, 12).map((p) => (
                  <TarjetaProducto key={p.id} producto={p} />
                ))}
              </div>
            </div>
          ) : null}

          {serviciosFiltrados.length ? (
            <div className="mt-8">
              <TituloSeccion
                titulo="Servicios"
                accion={
                  <Link
                    to="/servicios"
                    search={{ categoria: categoria.slug }}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
                  >
                    Ver todos <ArrowRight className="h-4 w-4" />
                  </Link>
                }
              />
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {serviciosFiltrados.slice(0, 12).map((s) => (
                  <TarjetaServicio key={s.id} servicio={s} />
                ))}
              </div>
            </div>
          ) : null}

          {tiendasFiltradas.length ? (
            <div className="mt-8">
              <TituloSeccion
                titulo="Tiendas"
                accion={
                  <Link
                    to="/tiendas"
                    search={{ categoria: categoria.nombre }}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
                  >
                    Ver todas <ArrowRight className="h-4 w-4" />
                  </Link>
                }
              />
              <div className="grid gap-4 lg:grid-cols-2">
                {tiendasFiltradas.map((t) => (
                  <TarjetaTienda key={t.id} tienda={t} />
                ))}
              </div>
            </div>
          ) : null}

          {!productosFiltrados.length && !serviciosFiltrados.length && !tiendasFiltradas.length && (
            <p className="card-uniko p-8 text-center text-sm text-muted-foreground">
              No hay contenido en esta categoría con los filtros actuales.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
