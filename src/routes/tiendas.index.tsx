import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MapPin, Filter } from "lucide-react";
import { TarjetaTienda } from "@/components/uniko/Tarjetas";
import { fetchTiendas } from "@/lib/queries";
import { provincias } from "@/data/marketplace";
import type { Tienda } from "@/data/marketplace";

export const Route = createFileRoute("/tiendas/")({
  loader: async () => ({ tiendas: await fetchTiendas() }),
  head: () => ({
    meta: [
      { title: "Tiendas dominicanas · UNIKO-RD" },
      {
        name: "description",
        content:
          "Descubre tiendas y negocios dominicanos verificados con envíos a todo el país en UNIKO-RD.",
      },
      { property: "og:title", content: "Tiendas dominicanas · UNIKO-RD" },
      {
        property: "og:description",
        content: "Sigue tus negocios favoritos y compra directo a vendedores locales.",
      },
    ],
  }),
  component: Tiendas,
});

function Tiendas() {
  const { tiendas } = Route.useLoaderData();
  const [provincia, setProvincia] = useState("todas");

  const lista = useMemo(
    () => tiendas.filter((t) => provincia === "todas" || t.ubicacion.includes(provincia)),
    [tiendas, provincia],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl sm:text-3xl">Tiendas dominicanas</h1>
      <p className="mt-1 text-sm text-muted-foreground">{lista.length} tiendas encontradas</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="card-uniko h-fit p-5">
          <Campo label="Ubicación">
            <select
              value={provincia}
              onChange={(e) => setProvincia(e.target.value)}
              className="select-uniko w-full"
            >
              <option value="todas">Toda RD</option>
              {provincias.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Campo>
        </aside>

        <div className="min-w-0">
          <div className="mb-4 flex items-center justify-end gap-2">
            <span className="text-sm text-muted-foreground">{lista.length} resultados</span>
          </div>
          {lista.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {lista.map((t) => (
                <TarjetaTienda key={t.id} tienda={t} />
              ))}
            </div>
          ) : (
            <p className="card-uniko p-8 text-center text-sm text-muted-foreground">
              No hay tiendas en esa ubicación.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-primary">{label}</p>
      {children}
    </div>
  );
}
