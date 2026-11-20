import { Link } from "@tanstack/react-router";
import { BadgePercent, Share2, Wallet } from "lucide-react";
import { PROGRAMA } from "@/lib/afiliados";

/** Banner de la home que invita a unirse a Uniko Afiliados. */
export function PromoAfiliados() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-6">
      <div className="bg-primary text-primary-foreground grid items-center gap-6 overflow-hidden rounded-3xl p-6 sm:p-8 lg:grid-cols-[1fr_auto]">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest opacity-80">
            <BadgePercent className="h-4 w-4" /> Nuevo · {PROGRAMA}
          </p>
          <h2 className="mt-2 text-2xl sm:text-3xl">Gana dinero recomendando productos</h2>
          <p className="mt-2 max-w-2xl text-sm opacity-90">
            Comparte tu enlace personal de cualquier producto de UNIKO-RD y gana el 10 % de cada venta. Tienes tu
            propia vitrina y ves tus clics y comisiones en tiempo real.
          </p>
          <ul className="mt-4 flex flex-wrap gap-3 text-xs font-semibold">
            <li className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1">
              <Share2 className="h-3.5 w-3.5" /> Comparte en tus redes
            </li>
            <li className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1">
              <Wallet className="h-3.5 w-3.5" /> Cobra por cada venta
            </li>
          </ul>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/afiliados/panel" className="btn-base bg-white font-bold text-primary hover:bg-white/90">
            Unirme gratis
          </Link>
          <Link to="/afiliados" className="btn-base btn-ghost-light">
            Cómo funciona
          </Link>
        </div>
      </div>
    </section>
  );
}
