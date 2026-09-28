import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Package, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { fetchCategorias, slugUnico, subirArchivos } from "@/lib/queries";
import { provincias } from "@/data/marketplace";
import type { Categoria } from "@/data/marketplace";
import type { StoreRow } from "@/lib/types";

export const Route = createFileRoute("/publicar")({
  loader: async () => ({ categorias: await fetchCategorias() }),
  head: () => ({
    meta: [
      { title: "Publicar producto · UNIKO-RD" },
      {
        name: "description",
        content:
          "Publica tu producto en UNIKO-RD y llega a miles de compradores en toda República Dominicana.",
      },
    ],
  }),
  component: Publicar,
});

function Publicar() {
  const { categorias } = Route.useLoaderData();
  const router = useRouter();
  const { session, loading } = useAuth();

  const [tienda, setTienda] = useState<StoreRow | null>(null);
  const [cargandoTienda, setCargandoTienda] = useState(true);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState("");
  const [precio, setPrecio] = useState("");
  const [precioAnterior, setPrecioAnterior] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [envioNacional, setEnvioNacional] = useState(true);
  const [fotos, setFotos] = useState<File[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const [enviando, setEnviando] = useState(false);

  const categoriasProducto = categorias.filter((c) => c.tipo !== "servicio");

  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!userId) {
      setTienda(null);
      setCargandoTienda(false);
      return;
    }
    let activo = true;
    setCargandoTienda(true);
    supabase
      .from("stores")
      .select("*")
      .eq("owner_id", userId)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!activo) return;
        setTienda((data as StoreRow | null) ?? null);
        setCargandoTienda(false);
      });
    return () => {
      activo = false;
    };
  }, [userId]);

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enviando || !session || !tienda) return;
    if (!fotos.length) {
      toast.error("Sube al menos una foto del producto.");
      return;
    }
    if (!titulo.trim() || !Number.isFinite(Number(precio)) || Number(precio) < 0) {
      toast.error("Indica un título y precio válidos.");
      return;
    }
    if (precioAnterior && Number(precioAnterior) <= Number(precio)) {
      toast.error("El precio anterior debe ser mayor que el precio actual.");
      return;
    }
    setEnviando(true);
    try {
      const id = slugUnico(titulo);
      const carpeta = session.user.id;
      const fotosUrls = await subirArchivos(fotos, carpeta);
      const videosUrls = videos.length ? await subirArchivos(videos, carpeta) : [];

      const { data, error } = await supabase
        .from("products")
        .insert({
          id,
          store_id: tienda.id,
          title: titulo.trim(),
          description: descripcion.trim() || null,
          category: categoria || null,
          price: Number(precio),
          compare_at_price: precioAnterior ? Number(precioAnterior) : null,
          location: ubicacion || null,
          shipping: envioNacional,
          image: fotosUrls[0] ?? null,
          gallery: fotosUrls,
          videos: videosUrls,
          is_new: true,
        })
        .select("sku")
        .single();
      if (error) throw new Error(error.message);

      await router.invalidate();
      toast.success(`¡Producto publicado! SKU ${data.sku}`);
      router.history.push(`/productos/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No pudimos publicar el producto.");
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="card-uniko p-8">
          <h1 className="text-xl font-bold">Necesitas una cuenta</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Inicia sesión o crea tu cuenta para publicar productos en UNIKO-RD.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              to="/auth"
              search={{ redirect: "/publicar", modo: "crear" }}
              className="btn-base btn-brand"
            >
              Crear cuenta
            </Link>
            <Link
              to="/auth"
              search={{ redirect: "/publicar", modo: "entrar" }}
              className="btn-base btn-outline"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (cargandoTienda) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Cargando tu tienda…</p>
      </div>
    );
  }

  if (!tienda) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="card-uniko p-8">
          <Package className="mx-auto h-10 w-10 text-brand" />
          <h1 className="mt-4 text-xl font-bold">Primero crea tu tienda</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Necesitas una tienda para publicar productos. Es gratis y tarda un minuto.
          </p>
          <Link to="/vender" className="btn-base btn-brand mt-4 inline-flex">
            Crear mi tienda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl sm:text-3xl">Publicar producto en {tienda.name}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Completa la información y tu producto aparecerá en el marketplace al instante.
      </p>

      <form onSubmit={crear} className="card-uniko mt-6 grid gap-5 p-6">
        <Campo label="Título del producto">
          <input
            type="text"
            required
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej: iPhone 15 Pro Max 256GB"
            className="input-uniko"
            maxLength={120}
          />
        </Campo>

        <Campo label="Descripción">
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Estado, características, garantía, qué incluye…"
            className="input-uniko min-h-24 resize-y"
            maxLength={1000}
          />
        </Campo>

        <Campo label="SKU (número de artículo)">
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value="Asignado al publicar"
              className="input-uniko flex-1 font-mono"
              aria-label="SKU del producto"
            />
          </div>
        </Campo>

        <div className="grid gap-5 sm:grid-cols-2">
          <Campo label="Categoría">
            <select
              required
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="select-uniko"
            >
              <option value="">Selecciona…</option>
              {categoriasProducto.map((c: Categoria) => (
                <option key={c.slug} value={c.slug}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </Campo>

          <Campo label="Ubicación">
            <select
              required
              value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value)}
              className="select-uniko"
            >
              <option value="">Selecciona…</option>
              {provincias.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <Campo label="Precio (RD$)">
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              placeholder="0"
              className="input-uniko"
            />
          </Campo>
          <Campo label="Precio anterior (opcional)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={precioAnterior}
              onChange={(e) => setPrecioAnterior(e.target.value)}
              placeholder="0"
              className="input-uniko"
            />
          </Campo>
          <Campo>
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={envioNacional}
                onChange={(e) => setEnvioNacional(e.target.checked)}
                className="rounded border-border accent-brand"
              />
              Envíos a todo el país
            </label>
          </Campo>
        </div>

        <Campo label="Fotos del producto (varias)">
          <div className="grid gap-2">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background px-3 py-3 text-xs font-semibold text-muted-foreground hover:border-brand hover:text-brand">
              {fotos.length ? `${fotos.length} foto(s) seleccionada(s)` : "Seleccionar fotos"}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => setFotos(Array.from(e.target.files ?? []))}
              />
            </label>
            {fotos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {fotos.map((f, i) => (
                  <span
                    key={`${f.name}-${i}`}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground"
                  >
                    {f.name.slice(0, 24)}
                    <button
                      type="button"
                      aria-label={`Quitar ${f.name}`}
                      onClick={() => setFotos((prev) => prev.filter((_, j) => j !== i))}
                      className="text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </Campo>

        <Campo label="Videos del producto (opcional)">
          <div className="grid gap-2">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background px-3 py-3 text-xs font-semibold text-muted-foreground hover:border-brand hover:text-brand">
              {videos.length ? `${videos.length} video(s) seleccionado(s)` : "Seleccionar videos"}
              <input
                type="file"
                accept="video/*"
                multiple
                className="hidden"
                onChange={(e) => setVideos(Array.from(e.target.files ?? []))}
              />
            </label>
            {videos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {videos.map((f, i) => (
                  <span
                    key={`${f.name}-${i}`}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground"
                  >
                    {f.name.slice(0, 24)}
                    <button
                      type="button"
                      aria-label={`Quitar ${f.name}`}
                      onClick={() => setVideos((prev) => prev.filter((_, j) => j !== i))}
                      className="text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </Campo>

        <button type="submit" disabled={enviando} className="btn-base btn-brand">
          <Package className="h-4 w-4" />
          {enviando ? "Subiendo archivos y publicando…" : "Publicar producto"}
        </button>
        <p className="text-center text-xs text-muted-foreground">
          Al publicar aceptas las normas de venta de UNIKO-RD.
        </p>
      </form>
    </div>
  );
}

function Campo({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-bold uppercase tracking-wide text-primary">{label}</span>
      {children}
    </label>
  );
}
