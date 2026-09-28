import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import {
  MapPin,
  Truck,
  ShieldCheck,
  RotateCcw,
  CreditCard,
  Minus,
  Plus,
  ArrowRight,
} from "lucide-react";
import { formatearRD } from "@/data/marketplace";
import { BadgeVerificado, Estrellas, Etiqueta, TituloSeccion } from "@/components/uniko/Primitivos";
import { TarjetaProducto } from "@/components/uniko/Tarjetas";
import { fetchProductos } from "@/lib/queries";
import type { Producto } from "@/data/marketplace";

export const Route = createFileRoute("/productos/$productoId")({
  loader: async ({ params }) => {
    const productos = await fetchProductos();
    const producto = productos.find((p) => p.id === params.productoId);
    if (!producto) throw notFound();
    return { producto, productos };
  },
  head: ({ loaderData }) => {
    if (!loaderData)
      return {
        meta: [
          { title: "Producto no encontrado · UNIKO-RD" },
          { name: "robots", content: "noindex" },
        ],
      };
    const { producto } = loaderData;
    return {
      meta: [
        { title: `${producto.titulo} · UNIKO-RD` },
        {
          name: "description",
          content: `${producto.titulo} en ${formatearRD(producto.precio)} · ${producto.tienda}, ${producto.ubicacion}.`,
        },
        { property: "og:title", content: `${producto.titulo} · UNIKO-RD` },
        {
          property: "og:description",
          content: `${formatearRD(producto.precio)} · ${producto.tienda} (${producto.ubicacion})`,
        },
      ],
    };
  },
  component: DetalleProducto,
});

function DetalleProducto() {
  const { producto, productos } = Route.useLoaderData();
  const [cantidad, setCantidad] = useState(1);
  const [tab, setTab] = useState("descripcion");
  const imagenes = producto.galeria?.length
    ? producto.galeria
    : producto.imagen
      ? [producto.imagen]
      : [];
  const videos = producto.videos ?? [];
  const [idxImagen, setIdxImagen] = useState(0);
  const imagenActiva = imagenes[idxImagen] ?? imagenes[0] ?? "";
  const relacionados = productos.filter(
    (p) => p.id !== producto.id && p.categoria === producto.categoria,
  );
  const descuento = producto.precioAnterior
    ? Math.round((1 - producto.precio / producto.precioAnterior) * 100)
    : 0;

  const tabs = [
    { id: "descripcion", label: "Descripción" },
    { id: "caracteristicas", label: "Características" },
    { id: "envios", label: "Envíos" },
    { id: "devoluciones", label: "Devoluciones" },
    { id: "resenas", label: "Reseñas" },
    { id: "preguntas", label: "Preguntas y respuestas" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_minmax(0,0.9fr)]">
        <div className="min-w-0">
          <div className="card-uniko overflow-hidden">
            {videos.length ? (
              <video src={videos[0]} controls className="aspect-4/3 w-full bg-black" />
            ) : (
              <img
                src={imagenActiva || producto.imagen}
                alt={producto.titulo}
                className="aspect-4/3 w-full object-cover"
              />
            )}
          </div>
          <div className="mt-3 grid grid-cols-4 gap-3">
            {imagenes.map((src, i) => (
              <button
                key={`${src}-${i}`}
                type="button"
                onClick={() => setIdxImagen(i)}
                className={`overflow-hidden rounded-xl border ${
                  imagenActiva === src ? "border-brand" : "border-border"
                }`}
                aria-label={`Ver foto ${i + 1}`}
              >
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  className="aspect-square w-full object-cover"
                />
              </button>
            ))}
          </div>
          {videos.length > 1 && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {videos.map((v, i) => (
                <video key={`${v}-${i}`} src={v} controls className="w-full rounded-xl bg-black" />
              ))}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <h1 className="text-2xl leading-snug sm:text-3xl">{producto.titulo}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Estrellas rating={producto.rating} resenas={producto.resenas} />
            <span className="text-xs font-semibold text-success">En stock</span>
          </div>

          <div className="mt-4 flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-bold text-brand">{formatearRD(producto.precio)}</span>
            {producto.precioAnterior ? (
              <>
                <span className="text-sm text-muted-foreground line-through">
                  {formatearRD(producto.precioAnterior)}
                </span>
                <Etiqueta>-{descuento}%</Etiqueta>
              </>
            ) : null}
          </div>

          {producto.sku && (
            <p className="mt-2 text-xs font-mono text-muted-foreground">SKU: {producto.sku}</p>
          )}

          <div className="mt-5 card-uniko p-4">
            <div className="flex min-w-0 items-center gap-2">
              {producto.tiendaId ? (
                <Link
                  to="/tiendas/$tiendaId"
                  params={{ tiendaId: producto.tiendaId }}
                  className="truncate text-sm font-bold text-foreground transition hover:text-brand"
                >
                  {producto.tienda}
                </Link>
              ) : (
                <span className="truncate text-sm font-bold text-foreground">
                  {producto.tienda}
                </span>
              )}
              {producto.verificado ? <BadgeVerificado texto="" /> : null}
            </div>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> {producto.ubicacion}
            </p>
            {producto.envioNacional && (
              <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                <Truck className="h-3.5 w-3.5" /> Envíos a todo el país
              </p>
            )}
          </div>

          <div className="mt-5 flex items-center gap-3">
            <span className="text-sm font-semibold">Cantidad</span>
            <div className="flex items-center gap-2 rounded-full border border-border px-2 py-1">
              <button
                type="button"
                aria-label="Reducir"
                onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                className="grid h-7 w-7 place-items-center rounded-full hover:bg-accent"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-6 text-center text-sm font-bold">{cantidad}</span>
              <button
                type="button"
                aria-label="Aumentar"
                onClick={() => setCantidad((c) => c + 1)}
                className="grid h-7 w-7 place-items-center rounded-full hover:bg-accent"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <span className="text-sm text-muted-foreground">
              Total:{" "}
              <strong className="text-foreground">{formatearRD(producto.precio * cantidad)}</strong>
            </span>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Link to="/carrito" className="btn-base btn-brand">
              Agregar al carrito
            </Link>
            <Link to="/checkout" className="btn-base btn-primary">
              Comprar ahora
            </Link>
            <Link to="/mensajes" className="btn-base btn-outline sm:col-span-2">
              Contactar vendedor
            </Link>
          </div>

          <ul className="mt-6 grid gap-2 text-xs text-muted-foreground">
            <li className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Compra protegida por UNIKO-RD
            </li>
            <li className="inline-flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-primary" /> Devoluciones dentro de 7 días
            </li>
            <li className="inline-flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" /> Tarjeta, transferencia o pago contra
              entrega
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-10">
        <div className="flex flex-wrap gap-2 border-b border-border pb-3">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ${tab === t.id ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="card-uniko mt-4 p-6 text-sm leading-relaxed text-muted-foreground">
          {tab === "descripcion" && (
            <p>
              {producto.descripcion ??
                `${producto.titulo} disponible en ${producto.tienda}, ${producto.ubicacion}. Producto
              original con garantía del vendedor y soporte a través del sistema de mensajes de
              UNIKO-RD.`}
            </p>
          )}
          {tab === "caracteristicas" && (
            <ul className="list-inside list-disc space-y-1">
              <li>Condición: nuevo</li>
              <li>Garantía del vendedor: 6 meses</li>
              <li>Categoría: {producto.categoria}</li>
              <li>Vendedor verificado: {producto.verificado ? "Sí" : "En proceso"}</li>
            </ul>
          )}
          {tab === "envios" && (
            <p>
              {producto.envioNacional
                ? "Envíos a todo el país en 24 a 72 horas según la provincia."
                : "Entrega y recogida coordinadas con el vendedor en su localidad."}
            </p>
          )}
          {tab === "devoluciones" && (
            <p>
              Devoluciones dentro de 7 días si el producto llega defectuoso o distinto a la
              publicación.
            </p>
          )}
          {tab === "resenas" && (
            <div className="space-y-4">
              <Estrellas rating={producto.rating} resenas={producto.resenas} />
              <p>"Excelente atención y entrega rápida a Santiago." — Cliente verificado</p>
              <p>"Producto tal cual la descripción, lo recomiendo." — Cliente verificado</p>
            </div>
          )}
          {tab === "preguntas" && (
            <p>Aún no hay preguntas. Envía la tuya al vendedor desde "Contactar vendedor".</p>
          )}
        </div>
      </div>

      {relacionados.length && (
        <div className="mt-12">
          <TituloSeccion titulo="Productos relacionados" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {relacionados.slice(0, 4).map((p) => (
              <TarjetaProducto key={p.id} producto={p} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-12">
        <TituloSeccion titulo="También te puede interesar" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {productos
            .filter((p) => p.id !== producto.id)
            .slice(0, 4)
            .map((p) => (
              <TarjetaProducto key={p.id} producto={p} />
            ))}
        </div>
      </div>
    </div>
  );
}
