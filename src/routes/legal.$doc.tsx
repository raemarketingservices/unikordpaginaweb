import { createFileRoute, notFound } from "@tanstack/react-router";
import { DocLegalVista } from "@/components/uniko/LegalDoc";
import { DOCS, docPorSlug } from "@/data/legal";

export const Route = createFileRoute("/legal/$doc")({
  params: {
    parse: (params) => ({ doc: String(params.doc ?? "") }),
    stringify: (params) => ({ doc: params.doc }),
  },
  loader: ({ params }) => {
    const doc = docPorSlug(params.doc);
    if (!doc) throw notFound();
    return { doc };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.doc.titulo} · UNIKO-RD` },
          { name: "description", content: loaderData.doc.resumen },
        ]
      : [],
  }),
  component: LegalDocRoute,
  notFoundComponent: () => (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="card-uniko p-8">
        <h1 className="text-xl font-bold">Documento no encontrado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Los documentos disponibles son: {DOCS.map((d) => d.titulo).join(", ")}.
        </p>
      </div>
    </div>
  ),
});

function LegalDocRoute() {
  const { doc } = Route.useLoaderData();
  return <DocLegalVista doc={doc} />;
}
