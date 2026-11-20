import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { VitrinaVista } from "@/components/afiliados/VitrinaVista";
import { fetchVitrina } from "@/lib/afiliados";

export const Route = createFileRoute("/afiliados/$slug")({
  loader: async ({ params }) => {
    const vitrina = await fetchVitrina(params.slug);
    if (!vitrina) throw notFound();
    return { vitrina };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `${loaderData.vitrina.theme.titulo ?? "Recomendados"} · ${loaderData.vitrina.nombre} · UNIKO-RD`
          : "Vitrina no encontrada · UNIKO-RD",
      },
    ],
  }),
  notFoundComponent: () => (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-xl">Esta vitrina no existe o está pausada</h1>
      <Link to="/productos" className="btn-base btn-brand mt-4">
        Ver productos
      </Link>
    </div>
  ),
  component: PaginaVitrina,
});

function PaginaVitrina() {
    const { vitrina } = Route.useLoaderData();
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <VitrinaVista nombre={vitrina.nombre} tema={vitrina.theme} productos={vitrina.productos} slug={vitrina.slug} />
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Vitrina de un miembro de <Link to="/afiliados" className="font-semibold text-primary">Uniko Afiliados</Link>.
          Las compras se hacen en UNIKO-RD con las tiendas originales.
        </p>
      </div>
    );
}
