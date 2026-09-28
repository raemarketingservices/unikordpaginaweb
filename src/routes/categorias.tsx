import { createFileRoute, Link } from "@tanstack/react-router";
import { Grid, ArrowRight } from "lucide-react";
import { GrillaCategorias, IconoCategoria } from "@/components/uniko/Categorias";
import { TituloSeccion } from "@/components/uniko/Primitivos";
import { fetchCategorias, fetchProductos, fetchServicios, fetchTiendas } from "@/lib/queries";

export const Route = createFileRoute("/categorias")({
  loader: async () => ({ categorias: await fetchCategorias() }),
  head: () => ({
    meta: [
      { title: "Todas las categorías · UNIKO-RD" },
      {
        name: "description",
        content: "Explora todas las categorías de productos, servicios y tiendas en UNIKO-RD.",
      },
    ],
  }),
  component: Categorias,
});

function Categorias() {
  const { categorias } = Route.useLoaderData();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <TituloSeccion
        titulo="Categorías"
        descripcion="Explora productos, servicios y tiendas por categoría"
        accion={
          <Link
            to="/productos"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
          >
            Ver productos <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
      <GrillaCategorias lista={categorias} />
    </div>
  );
}
