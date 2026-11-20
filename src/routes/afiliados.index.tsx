import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgePercent, Link2, Palette, Share2, TrendingUp, Wallet } from "lucide-react";
import { PROGRAMA } from "@/lib/afiliados";

export const Route = createFileRoute("/afiliados/")({
  head: () => ({
    meta: [
      { title: `${PROGRAMA} · Gana dinero recomendando productos · UNIKO-RD` },
      {
        name: "description",
        content:
          "Únete gratis a Uniko Afiliados: comparte enlaces de productos de tiendas dominicanas y gana 10 % de comisión por cada venta.",
      },
      { property: "og:title", content: `${PROGRAMA} · Gana recomendando` },
    ],
  }),
  component: Landing,
});

const PASOS = [
  { icono: Link2, titulo: "Elige productos", texto: "Escoge del catálogo los productos que quieres recomendar y obtén un enlace único para cada uno." },
  { icono: Share2, titulo: "Compártelos", texto: "Publica tus enlaces o tu vitrina en Instagram, TikTok, WhatsApp o donde tengas audiencia." },
  { icono: Wallet, titulo: "Cobra comisiones", texto: "Cuando alguien compra por tu enlace, ganas el 10 % y lo ves al instante en tu panel." },
];

const VENTAJAS = [
  { icono: BadgePercent, texto: "10 % de comisión por venta" },
  { icono: TrendingUp, texto: "Clics y ventas en tiempo real" },
  { icono: Palette, texto: "Tu propia vitrina personalizable" },
];

function Landing() {
  return (
    <div>
      <section className="bg-gradient-to-br from-primary to-brand text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 lg:py-20">
          <p className="text-xs font-bold uppercase tracking-widest opacity-80">{PROGRAMA}</p>
          <h1 className="mt-3 max-w-2xl text-3xl leading-tight text-white sm:text-5xl">
            Recomienda lo que te gusta y gana dinero con cada venta
          </h1>
          <p className="mt-4 max-w-xl text-white/90">
            Comparte productos de tiendas dominicanas con tu enlace personal y cobra comisión cada vez
            que alguien compra. Es gratis.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/afiliados/panel" className="btn-base bg-white font-bold text-primary hover:bg-white/90">
              Quiero ser afiliado
            </Link>
            <Link to="/afiliados/terminos" className="btn-base btn-ghost-light">
              Ver guías del programa
            </Link>
          </div>
          <ul className="mt-8 flex flex-wrap gap-4 text-sm">
            {VENTAJAS.map(({ icono: Icono, texto }) => (
              <li key={texto} className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5">
                <Icono className="h-4 w-4" /> {texto}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl">Cómo funciona</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {PASOS.map(({ icono: Icono, titulo, texto }, i) => (
            <div key={titulo} className="card-uniko p-6">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
                <Icono className="h-5 w-5" />
              </span>
              <h3 className="mt-3 text-lg">
                {i + 1}. {titulo}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{texto}</p>
            </div>
          ))}
        </div>
        <div className="card-uniko mt-8 flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <h3 className="text-lg">¿Listo para empezar?</h3>
            <p className="text-sm text-muted-foreground">Regístrate con tu cuenta de UNIKO-RD en un minuto.</p>
          </div>
          <Link to="/afiliados/panel" className="btn-base btn-brand">
            Unirme a {PROGRAMA}
          </Link>
        </div>
      </section>
    </div>
  );
}
