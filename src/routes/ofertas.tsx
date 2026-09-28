import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Tag, ArrowRight } from "lucide-react";
import { TarjetaProducto } from "@/components/uniko/Tarjetas";
import { TituloSeccion } from "@/components/uniko/Primitivos";
import { fetchProductos } from "@/lib/queries";

export const Route = createFileRoute("/ofertas")({
  loader: async () => ({ productos: await fetchProductos() }),
  head: () => ({
    meta: [
      { title: "Ofertas destacadas · UNIKO-RD" },
      {
        name: "description",
        content:
          "Descuentos activos en productos de tiendas verificadas con envíos a todo el país.",
      },
    ],
  }),
  component: Ofertas,
});

function Ofertas() {
  const { productos } = Route.useLoaderData();

  const ofertas = useMemo(
    () => productos.filter((p) => p.precioAnterior != null && p.precioAnterior > p.precio),
    [productos],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <TituloSeccion
        titulo="Ofertas destacadas"
        descripcion="Descuentos activos de tiendas verificadas"
        accion={
          <Link
            to="/productos"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
          >
            Ver todos los productos <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
      {ofertas.length ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {ofertas.map((p) => (
            <TarjetaProducto key={p.id} producto={p} />
          ))}
        </div>
      ) : (
        <p className="card-uniko p-8 text-center text-sm text-muted-foreground">
          No hay ofertas activas en este momento.
        </p>
      )}
    </div>
  );
}
