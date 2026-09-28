import { Link, useNavigate } from "@tanstack/react-router";
import {
  Search,
  MapPin,
  Heart,
  MessageCircle,
  ShoppingCart,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { Logo } from "./Logo";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { provincias } from "@/data/marketplace";

const navegacion = [
  { label: "Inicio", to: "/" as const },
  { label: "Productos", to: "/productos" as const },
  { label: "Servicios", to: "/servicios" as const },
  { label: "Tiendas", to: "/tiendas" as const },
  { label: "Ofertas", to: "/ofertas" as const },
  { label: "Categorías", to: "/categorias" as const },
  { label: "Vender en UNIKO-RD", to: "/vender" as const },
];

export function Header() {
  const navigate = useNavigate();
  const { session, profile, loading, salir, isAdmin } = useAuth();
  const { unidades } = useCart();
  const [abierto, setAbierto] = useState(false);
  const [consulta, setConsulta] = useState("");
  const [ubicacion, setUbicacion] = useState("Toda RD");
  const autenticado = !loading && session;

  const buscar = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/buscar", search: { q: consulta, ubicacion } });
    setAbierto(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              aria-label="Abrir menú"
              onClick={() => setAbierto((v) => !v)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-primary hover:bg-accent lg:hidden"
            >
              {abierto ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Logo className="h-9 sm:h-11" />
          </div>

          <form onSubmit={buscar} className="hidden min-w-0 md:block">
            <div className="flex items-center gap-2 rounded-full border border-border bg-background px-2 py-1.5 focus-within:border-primary">
              <label className="hidden items-center gap-1 border-r border-border pl-2 pr-3 text-xs font-semibold text-primary lg:flex">
                <MapPin className="h-4 w-4 shrink-0" />
                <select
                  value={ubicacion}
                  onChange={(e) => setUbicacion(e.target.value)}
                  className="max-w-[9rem] bg-transparent text-xs font-semibold outline-none"
                  aria-label="Ubicación"
                >
                  <option>Toda RD</option>
                  {provincias.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
                <ChevronDown className="h-3.5 w-3.5" />
              </label>
              <input
                value={consulta}
                onChange={(e) => setConsulta(e.target.value)}
                placeholder="¿Qué estás buscando?"
                aria-label="Buscar en UNIKO-RD"
                className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                aria-label="Buscar"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-brand-foreground transition-colors hover:brightness-95"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>

          <div className="flex shrink-0 items-center gap-1">
            <Link
              to="/favoritos"
              aria-label="Favoritos"
              className="grid h-10 w-10 place-items-center rounded-full text-primary hover:bg-accent"
            >
              <Heart className="h-5 w-5" />
            </Link>
            <Link
              to="/mensajes"
              aria-label="Mensajes"
              className="hidden h-10 w-10 place-items-center rounded-full text-primary hover:bg-accent sm:grid"
            >
              <MessageCircle className="h-5 w-5" />
            </Link>
            <Link
              to="/carrito"
              aria-label="Carrito"
              className="relative grid h-10 w-10 place-items-center rounded-full text-primary hover:bg-accent"
            >
              <ShoppingCart className="h-5 w-5" />
              {unidades > 0 ? (
                <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-foreground">
                  {unidades}
                </span>
              ) : null}
            </Link>
            {autenticado ? (
              <>
                {isAdmin ? (
                  <Link
                    to="/admin"
                    className="ml-1 hidden text-sm font-semibold text-brand hover:underline lg:block"
                  >
                    Admin
                  </Link>
                ) : null}
                <Link
                  to="/cuenta"
                  className="ml-1 hidden max-w-[11rem] truncate text-sm font-semibold text-primary hover:underline lg:block"
                >
                  {profile?.full_name ?? profile?.email ?? "Mi cuenta"}
                </Link>
                <button
                  type="button"
                  onClick={() => void salir()}
                  className="btn-base btn-outline ml-1 hidden px-4 py-2 text-sm lg:inline-flex"
                >
                  Salir
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="ml-1 hidden text-sm font-semibold text-primary hover:underline lg:block"
                >
                  Iniciar sesión
                </Link>
                <Link
                  to="/auth"
                  className="btn-base btn-brand ml-1 hidden px-4 py-2 text-sm lg:inline-flex"
                >
                  Crear cuenta
                </Link>
              </>
            )}
          </div>
        </div>

        <form onSubmit={buscar} className="pb-3 md:hidden">
          <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={consulta}
              onChange={(e) => setConsulta(e.target.value)}
              placeholder="¿Qué estás buscando?"
              aria-label="Buscar en UNIKO-RD"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
        </form>

        <nav className="hidden items-center gap-1 pb-2 lg:flex">
          {navegacion.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "bg-accent text-primary" }}
              className="rounded-full px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      {abierto ? (
        <nav className="border-t border-border bg-card px-4 py-3 lg:hidden">
          <ul className="grid gap-1">
            {navegacion.map((item) => (
              <li key={item.label}>
                <Link
                  to={item.to}
                  onClick={() => setAbierto(false)}
                  className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-accent hover:text-primary"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            {autenticado ? (
              <>
                <Link to="/cuenta" className="btn-base btn-outline flex-1">
                  Mi cuenta
                </Link>
                <button
                  type="button"
                  onClick={() => void salir()}
                  className="btn-base btn-brand flex-1"
                >
                  Salir
                </button>
              </>
            ) : (
              <>
                <Link to="/auth" className="btn-base btn-brand flex-1">
                  Crear cuenta
                </Link>
                <Link to="/auth" className="btn-base btn-outline flex-1">
                  Iniciar sesión
                </Link>
              </>
            )}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
