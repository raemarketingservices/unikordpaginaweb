import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Lock, Cookie, Scale } from "lucide-react";
import { DOCS, LEGAL } from "@/data/legal";

export const Route = createFileRoute("/legal/")({
  head: () => ({
    meta: [
      { title: "Documentos legales · UNIKO-RD" },
      {
        name: "description",
        content:
          "Términos y condiciones, política de privacidad, política de cookies y aviso de comercio electrónico de UNIKO-RD (Rep. Dominicana).",
      },
    ],
  }),
  component: LegalIndex,
});

const iconos: Record<string, typeof FileText> = {
  terminos: FileText,
  privacidad: Lock,
  cookies: Cookie,
  aviso: Scale,
};

function LegalIndex() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">Legal</p>
      <h1 className="mt-2 text-2xl sm:text-3xl">Documentos legales</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Transparencia y cumplimiento: aquí encuentras los términos de uso, cómo protegemos tus datos
        personales (Ley 158-13), las cookies que usamos y el aviso de comercio electrónico conforme
        a la Ley 177-07 de Rep. Dominicana.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {DOCS.map((doc) => {
          const Icono = iconos[doc.slug] ?? FileText;
          return (
            <Link
              key={doc.slug}
              to="/legal/$doc"
              params={{ doc: doc.slug }}
              className="card-uniko group grid gap-3 p-6"
            >
              <Icono className="h-6 w-6 text-brand" />
              <h2 className="text-lg group-hover:underline">{doc.titulo}</h2>
              <p className="text-sm text-muted-foreground">{doc.resumen}</p>
              <span className="text-xs font-bold uppercase tracking-wide text-primary">
                Leer documento →
              </span>
            </Link>
          );
        })}
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        Titular: {LEGAL.titular} · {LEGAL.url} · Contacto:{" "}
        <a href={`mailto:${LEGAL.correo}`} className="text-brand underline">
          {LEGAL.correo}
        </a>{" "}
        · Última actualización: {LEGAL.actualizacion}
      </p>
    </div>
  );
}
