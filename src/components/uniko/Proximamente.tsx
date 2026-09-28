import { Link } from "@tanstack/react-router";
import { ArrowLeft, Home, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";

export function Proximamente({
  titulo,
  descripcion,
  accion,
}: {
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="card-uniko p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent text-primary">
          <RotateCcw className="h-8 w-8 animate-spin" />
        </div>
        <h1 className="mt-5 text-xl font-bold">{titulo}</h1>
        {descripcion && <p className="mt-2 text-sm text-muted-foreground">{descripcion}</p>}
        <div className="mt-6 flex flex-col gap-2">
          {accion}
          <Link to="/" className="btn-base btn-outline">
            <ArrowLeft className="h-4 w-4" /> Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

export function PaginaEnConstruccion({ titulo }: { titulo: string }) {
  return (
    <Proximamente
      titulo={titulo}
      descripcion="Esta sección está en desarrollo. Pronto estará disponible."
      accion={
        <button type="button" className="btn-base btn-brand">
          <Home className="h-4 w-4" /> Ir a la home
        </button>
      }
    />
  );
}
