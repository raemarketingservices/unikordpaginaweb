import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, MapPin, ChevronDown } from "lucide-react";
import { TarjetaProducto } from "@/components/uniko/Tarjetas";
import { TituloSeccion, BadgeVerificado, Estrellas, Etiqueta } from "@/components/uniko/Primitivos";
import { fetchProductos, fetchCategorias } from "@/lib/queries";
import { provincias } from "@/data/marketplace";
import type { Categoria, Producto } from "@/data/marketplace";

export const Route = createFileRoute("/productos/")({
  loader: async () => ({
    productos: await fetchProductos(),
    categorias: await fetchCategorias(),
  }),
  head: () => ({
    meta: [
      { title: "Productos · UNIKO-RD" },
      {
        name: "description",
        content:
          "Explora miles de productos de tiendas dominicanas con envíos a todo el país y vendedores verificados.",
      },
      { property: "og:title", content: "Productos · UNIKO-RD" },
      {
        property: "og:description",
        content: "Compra tecnología, hogar, moda y más en tiendas dominicanas verificadas.",
      },
    ],
  }),
  component: Productos,
});

function Productos() {
  const { productos, categorias } = Route.useLoaderData();
  const [categoria, setCategoria] = useState("todas");
  const [provincia, setProvincia] = useState("todas");
  const [soloVerificados, setSoloVerificados] = useState(false);
  const [soloEnvio, setSoloEnvio] = useState(false);
  const [maximo, setMaximo] = useState(100000);
  const [orden, setOrden] = useState("relevancia");

  const lista = useMemo(() => {
    const filtrada = productos.filter(
      (p) =>
        (categoria === "todas" || p.categoria === categoria) &&
        (provincia === "todas" || p.ubicacion.includes(provincia)) &&
        (!soloVerificados || p.verificado) &&
        (!soloEnvio || p.envioNacional) &&
        p.precio <= maximo,
    );
    const copia = [...filtrada];
    if (orden === "precio-asc") copia.sort((a, b) => a.precio - b.precio);
    if (orden === "precio-desc") copia.sort((a, b) => b.precio - a.precio);
    if (orden === "rating") copia.sort((a, b) => b.rating - a.rating);
    return copia;
  }, [productos, categoria, provincia, soloVerificados, soloEnvio, maximo, orden]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl sm:text-3xl">Productos</h1>
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

          <Campo label={`Precio máximo: RD$${maximo.toLocaleString("es-DO")}`}>
            <input
              type="range"
              min={1000}
              max={100000}
              step={1000}
              value={maximo}
              onChange={(e) => setMaximo(Number(e.target.value))}
              className="w-full accent-[var(--brand)]"
            />
          </Campo>

          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={soloVerificados}
              onChange={(e) => setSoloVerificados(e.target.checked)}
            />{" "}
            Solo vendedores verificados
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={soloEnvio}
              onChange={(e) => setSoloEnvio(e.target.checked)}
            />{" "}
            Envíos a todo el país
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
              {lista.map((p) => (
                <TarjetaProducto key={p.id} producto={p} />
              ))}
            </div>
          ) : (
            <p className="card-uniko p-8 text-center text-sm text-muted-foreground">
              No encontramos productos con esos filtros.
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
