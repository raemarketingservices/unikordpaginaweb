import { Link } from "@tanstack/react-router";
import { Instagram, Facebook, Youtube, Music2 } from "lucide-react";
import { Logo } from "./Logo";

const columnas = [
  {
    titulo: "UNIKO-RD",
    enlaces: [
      { label: "Sobre nosotros", to: "/ayuda" as const },
      { label: "Cómo funciona", to: "/ayuda" as const },
      { label: "Blog", to: "/ayuda" as const },
      { label: "Contacto", to: "/ayuda" as const },
    ],
  },
  {
    titulo: "Comprar",
    enlaces: [
      { label: "Productos", to: "/productos" as const },
      { label: "Servicios", to: "/servicios" as const },
      { label: "Tiendas", to: "/tiendas" as const },
      { label: "Ofertas", to: "/ofertas" as const },
    ],
  },
  {
    titulo: "Vender",
    enlaces: [
      { label: "Crear tienda", to: "/vender" as const },
      { label: "Publicar servicio", to: "/vender" as const },
      { label: "Centro de vendedores", to: "/vender" as const },
    ],
  },
  {
    titulo: "Ayuda",
    enlaces: [
      { label: "Centro de ayuda", to: "/ayuda" as const },
      { label: "Envíos", to: "/ayuda" as const },
      { label: "Pagos", to: "/ayuda" as const },
      { label: "Devoluciones", to: "/ayuda" as const },
      { label: "Seguridad", to: "/ayuda" as const },
    ],
  },
  {
    titulo: "Legal",
    enlaces: [
      { label: "Términos y condiciones", doc: "terminos" },
      { label: "Privacidad", doc: "privacidad" },
      { label: "Política de cookies", doc: "cookies" },
      { label: "Aviso de comercio electrónico", doc: "aviso" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-16 bg-sidebar pb-24 pt-12 text-sidebar-foreground lg:pb-12">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_repeat(5,minmax(0,1fr))]">
          <div className="min-w-0">
            <Logo variante="blanco" className="h-14" />
            <p className="mt-4 text-sm font-medium opacity-90">
              Todo lo que buscas. En un solo lugar.
            </p>
            <p className="mt-2 text-sm opacity-75">
              Conectamos personas, productos y oportunidades en toda República Dominicana.
            </p>
            <div className="mt-4 flex gap-2">
              {[Instagram, Facebook, Music2, Youtube].map((Icono, i) => (
                <span
                  key={i}
                  className="grid h-9 w-9 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
                >
                  <Icono className="h-4 w-4" />
                </span>
              ))}
            </div>
          </div>

          {columnas.map((col) => (
            <div key={col.titulo} className="min-w-0">
              <h3 className="text-sm font-bold text-white">{col.titulo}</h3>
              <ul className="mt-3 space-y-2">
                {col.enlaces.map((e) => (
                  <li key={e.label}>
                    {"doc" in e ? (
                      <Link
                        to="/legal/$doc"
                        params={{ doc: e.doc }}
                        className="text-sm opacity-80 hover:opacity-100 hover:underline"
                      >
                        {e.label}
                      </Link>
                    ) : (
                      <Link
                        to={e.to}
                        className="text-sm opacity-80 hover:opacity-100 hover:underline"
                      >
                        {e.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-xs opacity-70">
          © {new Date().getFullYear()} UNIKO-RD · Marketplace Dominicano. Todos los derechos
          reservados.
        </div>
      </div>
    </footer>
  );
}
