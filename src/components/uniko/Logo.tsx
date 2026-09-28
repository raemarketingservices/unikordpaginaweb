import { Link } from "@tanstack/react-router";

const rutas = {
  color: "/uniko-logo.png",
  blanco: "/uniko-logo-blanco.png",
} as const;

export function Logo({
  variante = "color",
  className = "h-11",
}: {
  variante?: "color" | "blanco";
  className?: string;
}) {
  return (
    <Link to="/" className="inline-flex shrink-0 items-center" aria-label="UNIKO-RD inicio">
      <img
        src={rutas[variante]}
        alt="UNIKO-RD · Marketplace Dominicano"
        className={`w-auto object-contain ${className}`}
      />
    </Link>
  );
}
