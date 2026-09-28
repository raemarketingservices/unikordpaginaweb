import { Link } from "@tanstack/react-router";
import { ArrowLeft, Scale } from "lucide-react";
import { DOCS, LEGAL, type DocLegal } from "@/data/legal";

export function DocLegalVista({ doc }: { doc: DocLegal }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        to="/legal"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-brand"
      >
        <ArrowLeft className="h-4 w-4" /> Todos los documentos
      </Link>

      <div className="mt-4">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.2em] text-brand">
          <Scale className="h-3.5 w-3.5" /> Documento legal
        </p>
        <h1 className="mt-2 text-2xl sm:text-3xl">{doc.titulo}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{doc.resumen}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {LEGAL.sitio} · Titular: {LEGAL.titular} · Última actualización: {LEGAL.actualizacion}
        </p>
      </div>

      <article className="card-uniko mt-6 grid gap-6 p-6 sm:p-8">
        {doc.secciones.map((seccion) => (
          <section key={seccion.titulo} className="grid gap-2">
            <h2 className="text-lg">{seccion.titulo}</h2>
            {seccion.parrafos?.map((p, i) => (
              <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                {p}
              </p>
            ))}
            {seccion.items && (
              <ul className="grid gap-1.5">
                {seccion.items.map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
                    <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </article>

      <div className="mt-6 flex flex-wrap gap-2">
        {DOCS.filter((d) => d.slug !== doc.slug).map((d) => (
          <Link
            key={d.slug}
            to="/legal/$doc"
            params={{ doc: d.slug }}
            className="btn-base btn-outline !px-4 !py-2 !text-xs"
          >
            {d.titulo}
          </Link>
        ))}
        <a
          href={`mailto:${LEGAL.correo}`}
          className="btn-base btn-ghost-light !px-4 !py-2 !text-xs"
        >
          Contacto: {LEGAL.correo}
        </a>
      </div>
    </div>
  );
}
