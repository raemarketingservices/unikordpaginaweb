import { Package } from "lucide-react";
import { formatearRD } from "@/data/marketplace";
import { TEMA_BASE, type ProductoVitrina, type Tema } from "@/lib/afiliados";

const FORMA = { pill: "9999px", redondeado: "12px", recto: "0px" } as const;

/** Vitrina del afiliado con su tema. `slug` arma los enlaces con ?ref= (null en la vista previa). */
export function VitrinaVista({
  nombre,
  tema,
  productos,
  slug,
}: {
  nombre: string;
  tema: Tema;
  productos: ProductoVitrina[];
  slug: string | null;
}) {
  const t = { ...TEMA_BASE, ...tema };
  const lista = t.disposicion === "lista";
  const boton = { background: t.boton_color, borderRadius: FORMA[t.boton_forma] };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background">
      <div className="px-5 py-8 text-center text-white" style={{ background: t.color }}>
        <p className="text-xs font-bold uppercase tracking-widest opacity-80">Vitrina de {nombre}</p>
        <h1 className="mt-2 text-2xl text-white sm:text-3xl">{t.titulo}</h1>
        {t.bio && <p className="mx-auto mt-2 max-w-xl text-sm opacity-90">{t.bio}</p>}
      </div>
      <div className={`grid gap-4 p-4 ${lista ? "" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
        {productos.map((p) => (
          <article
            key={p.id}
            className={`overflow-hidden rounded-xl border border-border bg-card ${lista ? "flex items-center gap-3" : ""}`}
          >
            <div className={`shrink-0 bg-muted ${lista ? "h-24 w-24" : "aspect-square w-full"}`}>
              {p.imagen ? (
                <img src={p.imagen} alt={p.titulo} loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-muted-foreground">
                  <Package className="h-8 w-8" />
                </div>
              )}
            </div>
            <div className="grid min-w-0 flex-1 gap-1 p-3">
              <p className="line-clamp-2 text-sm font-semibold">{p.titulo}</p>
              <p className="text-xs text-muted-foreground">{p.tienda}</p>
              <p className="font-bold" style={{ color: t.color }}>
                {formatearRD(Number(p.precio))}
                {p.precio_anterior ? (
                  <span className="ml-2 text-xs font-normal text-muted-foreground line-through">
                    {formatearRD(Number(p.precio_anterior))}
                  </span>
                ) : null}
              </p>
              <a
                href={slug ? `/productos/${p.id}?ref=${slug}` : undefined}
                className="mt-1 inline-flex justify-center px-4 py-2 text-sm font-bold text-white"
                style={boton}
              >
                {t.boton_texto}
              </a>
            </div>
          </article>
        ))}
        {!productos.length && (
          <p className="p-6 text-center text-sm text-muted-foreground">Aún no hay productos en esta vitrina.</p>
        )}
      </div>
    </div>
  );
}
