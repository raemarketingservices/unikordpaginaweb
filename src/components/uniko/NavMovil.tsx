import { Link } from "@tanstack/react-router";
import { Home, LayoutGrid, Plus, MessageCircle, User, Car } from "lucide-react";

export function NavMovil() {
  const items = [
    { label: "Inicio", to: "/" as const, icono: Home },
    { label: "Vehículos", to: "/vehiculos" as const, icono: Car },
    { label: "Mensajes", to: "/mensajes" as const, icono: MessageCircle },
    { label: "Mi cuenta", to: "/cuenta" as const, icono: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur lg:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5 items-end px-2 py-1.5">
        {items.slice(0, 2).map((item) => (
          <ItemNav key={item.label} {...item} />
        ))}
        <li className="flex justify-center">
          <Link
            to="/publicar"
            aria-label="Publicar"
            className="-mt-6 grid h-14 w-14 place-items-center rounded-full bg-brand text-brand-foreground shadow-lg"
          >
            <Plus className="h-6 w-6" />
          </Link>
        </li>
        {items.slice(2).map((item) => (
          <ItemNav key={item.label} {...item} />
        ))}
      </ul>
    </nav>
  );
}

function ItemNav({
  label,
  to,
  icono: Icono,
}: {
  label: string;
  to: "/" | "/vehiculos" | "/mensajes" | "/cuenta";
  icono: typeof Home;
}) {
  return (
    <li>
      <Link
        to={to}
        activeOptions={{ exact: to === "/" }}
        activeProps={{ className: "text-brand" }}
        className="flex flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[11px] font-semibold text-muted-foreground"
      >
        <Icono className="h-5 w-5" />
        <span className="truncate">{label}</span>
      </Link>
    </li>
  );
}
