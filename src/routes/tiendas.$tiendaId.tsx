import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  MapPin,
  Users,
  Star,
  MessageCircle,
  ShieldCheck,
  RotateCcw,
  CreditCard,
  User,
} from "lucide-react";
import { formatearRD } from "@/data/marketplace";
import { BadgeVerificado, Estrellas, Etiqueta, TituloSeccion } from "@/components/uniko/Primitivos";
import { TarjetaProducto } from "@/components/uniko/Tarjetas";
import { fetchTiendas, fetchProductos, fetchMiRating, guardarRating } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import type { Tienda, Producto } from "@/data/marketplace";

export const Route = createFileRoute("/tiendas/$tiendaId")({
  loader: async ({ params }) => {
    const [tiendas, productos] = await Promise.all([fetchTiendas(), fetchProductos()]);
    const tienda = tiendas.find((t) => t.id === params.tiendaId);
    if (!tienda) throw notFound();
    const productosTienda = productos.filter((p) => p.tiendaId === tienda.id);
    return { tienda, productos: productosTienda };
  },
  head: ({ loaderData }) => {
    if (!loaderData)
      return {
        meta: [
          { title: "Tienda no encontrada · UNIKO-RD" },
          { name: "robots", content: "noindex" },
        ],
      };
    const { tienda } = loaderData;
    return {
      meta: [
        { title: `${tienda.nombre} · UNIKO-RD` },
        {
          name: "description",
          content: `${tienda.nombre} · ${tienda.categoria} en ${tienda.ubicacion}. ${tienda.productos} productos · ${tienda.seguidores.toLocaleString("es-DO")} seguidores.`,
        },
        { property: "og:title", content: `${tienda.nombre} · UNIKO-RD` },
        {
          property: "og:description",
          content: `${tienda.categoria} · ${tienda.ubicacion} · ${tienda.seguidores.toLocaleString("es-DO")} seguidores`,
        },
      ],
    };
  },
  component: DetalleTienda,
});

function ValoracionTienda({ tienda }: { tienda: Tienda }) {
  const { session, loading } = useAuth();
  const router = useRouter();
  const [miRating, setMiRating] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);

  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!userId) {
      setMiRating(null);
      return;
    }
    let activo = true;
    fetchMiRating(tienda.id, userId)
      .then((r) => {
        if (activo) setMiRating(r);
      })
      .catch(() => undefined);
    return () => {
      activo = false;
    };
  }, [tienda.id, userId]);

  const votar = async (n: number) => {
    if (!session || enviando) return;
    setEnviando(true);
    try {
      await guardarRating(tienda.id, session.user.id, n);
      setMiRating(n);
      toast.success(`Diste ${n} estrella${n > 1 ? "s" : ""} a ${tienda.nombre}.`);
      await router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No pudimos guardar tu calificación.");
    } finally {
      setEnviando(false);
    }
  };

  if (loading) return null;

  return (
    <div className="mt-4 rounded-xl border border-border bg-background p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-primary">Califica esta tienda</p>
      {session ? (
        <div className="mt-2 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => {
            const activa = n <= (hover ?? miRating ?? 0);
            return (
              <button
                key={n}
                type="button"
                disabled={enviando}
                aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(null)}
                onClick={() => votar(n)}
                className="transition-transform hover:scale-110"
              >
                <Star className={`h-6 w-6 ${activa ? "fill-brand text-brand" : "text-border"}`} />
              </button>
            );
          })}
          <span className="ml-2 text-xs text-muted-foreground">
            {miRating ? `Tu calificación: ${miRating}/5` : "Sin calificar"}
          </span>
        </div>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">
          <Link
            to="/auth"
            search={{ redirect: `/tiendas/${tienda.id}` }}
            className="font-semibold text-brand hover:underline"
          >
            Inicia sesión
          </Link>{" "}
          para calificar con estrellas.
        </p>
      )}
    </div>
  );
}

function DetalleTienda() {
  const { tienda, productos } = Route.useLoaderData();
  const [tab, setTab] = useState("productos");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_minmax(0,0.9fr)]">
        <div className="min-w-0">
          <div className="h-24 overflow-hidden bg-muted">
            <img
              src={tienda.portada}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="px-4 pb-4">
            <img
              src={tienda.logo}
              alt={tienda.nombre}
              loading="lazy"
              className="-mt-8 h-16 w-16 rounded-2xl border-4 border-card object-cover"
            />
            <div className="mt-2 flex min-w-0 items-center gap-1.5">
              <h3 className="truncate text-sm font-bold text-foreground">{tienda.nombre}</h3>
              {tienda.verificado ? <BadgeVerificado texto="" /> : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {tienda.categoria} · {tienda.ubicacion}
            </p>
            {tienda.propietario && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <User className="h-3.5 w-3.5" /> Propietario:{" "}
                <span className="font-semibold text-foreground">{tienda.propietario}</span>
              </p>
            )}
            {tienda.descripcion && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {tienda.descripcion}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Estrellas rating={tienda.rating} resenas={tienda.resenas} />
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" /> {tienda.seguidores.toLocaleString("es-DO")}{" "}
                seguidores
              </span>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="card-uniko p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{tienda.nombre}</h2>
              <div className="flex gap-2">
                <Link to="/mensajes" search={{ tienda: tienda.id }} className="btn-base btn-outline">
                  <MessageCircle className="h-4 w-4" /> Contactar
                </Link>
                <button className="btn-base btn-primary">Seguir</button>
              </div>
            </div>
            <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> {tienda.ubicacion}
              </div>
              {tienda.propietario && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" /> Propietario:{" "}
                  <span className="font-semibold text-foreground">{tienda.propietario}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" /> {tienda.seguidores.toLocaleString("es-DO")} seguidores
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 fill-brand text-brand" /> {tienda.rating.toFixed(1)} (
                {tienda.resenas} reseñas)
              </div>
              <div className="flex items-center gap-2">
                {tienda.verificado ? (
                  <BadgeVerificado texto="Tienda verificada" />
                ) : (
                  <span className="text-muted-foreground">Tienda no verificada</span>
                )}
              </div>
            </div>
            <ValoracionTienda tienda={tienda} />
          </div>

          <div className="mt-6">
            <div className="flex flex-wrap gap-2 border-b border-border pb-3">
              <button
                type="button"
                onClick={() => setTab("productos")}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${tab === "productos" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"}`}
              >
                Productos ({productos.length})
              </button>
              <button
                type="button"
                onClick={() => setTab("info")}
                className="rounded-full px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-accent"
              >
                Información
              </button>
            </div>
            <div className="card-uniko mt-4 p-6">
              {tab === "productos" && (
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {productos.length ? (
                    productos.map((p) => <TarjetaProducto key={p.id} producto={p} />)
                  ) : (
                    <p className="col-span-full text-center text-sm text-muted-foreground py-8">
                      Esta tienda aún no tiene productos publicados.
                    </p>
                  )}
                </div>
              )}
              {tab === "info" && (
                <div className="space-y-3 text-sm text-muted-foreground">
                  {tienda.propietario && (
                    <p>
                      <strong className="text-foreground">Propietario:</strong> {tienda.propietario}
                    </p>
                  )}
                  {tienda.descripcion && (
                    <p>
                      <strong className="text-foreground">Descripción:</strong> {tienda.descripcion}
                    </p>
                  )}
                  <p>
                    <strong className="text-foreground">Categoría:</strong> {tienda.categoria}
                  </p>
                  <p>
                    <strong className="text-foreground">Ubicación:</strong> {tienda.ubicacion}
                  </p>
                  {tienda.rnc && (
                    <p>
                      <strong className="text-foreground">RNC:</strong> {tienda.rnc}
                    </p>
                  )}
                  <p>
                    <strong className="text-foreground">Seguidores:</strong>{" "}
                    {tienda.seguidores.toLocaleString("es-DO")}
                  </p>
                  <p>
                    <strong className="text-foreground">Productos publicados:</strong>{" "}
                    {tienda.productos}
                  </p>
                  <p>
                    <strong className="text-foreground">Verificada:</strong>{" "}
                    {tienda.verificado ? "Sí" : "No"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
