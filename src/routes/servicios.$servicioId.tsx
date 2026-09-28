import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import {
  MapPin,
  CalendarCheck,
  RotateCcw,
  ShieldCheck,
  CreditCard,
  MessageCircle,
} from "lucide-react";
import { formatearRD } from "@/data/marketplace";
import { BadgeVerificado, Estrellas, Etiqueta, TituloSeccion } from "@/components/uniko/Primitivos";
import { TarjetaServicio } from "@/components/uniko/Tarjetas";
import { fetchServicios } from "@/lib/queries";
import type { Servicio } from "@/data/marketplace";

export const Route = createFileRoute("/servicios/$servicioId")({
  loader: async ({ params }) => {
    const servicios = await fetchServicios();
    const servicio = servicios.find((s) => s.id === params.servicioId);
    if (!servicio) throw notFound();
    return { servicio, servicios };
  },
  head: ({ loaderData }) => {
    if (!loaderData)
      return {
        meta: [
          { title: "Servicio no encontrado · UNIKO-RD" },
          { name: "robots", content: "noindex" },
        ],
      };
    const { servicio } = loaderData;
    return {
      meta: [
        { title: `${servicio.titulo} · UNIKO-RD` },
        {
          name: "description",
          content: `${servicio.titulo} desde ${formatearRD(servicio.desde)} · {servicio.proveedor}, {servicio.ubicacion}.`,
        },
        { property: "og:title", content: `${servicio.titulo} · UNIKO-RD` },
        {
          property: "og:description",
          content: `Desde ${formatearRD(servicio.desde)} · {servicio.proveedor} ({servicio.ubicacion})`,
        },
      ],
    };
  },
  component: DetalleServicio,
});

function DetalleServicio() {
  const { servicio, servicios } = Route.useLoaderData();
  const [tab, setTab] = useState("descripcion");
  const relacionados = servicios.filter(
    (s) => s.id !== servicio.id && s.categoria === servicio.categoria,
  );

  const tabs = [
    { id: "descripcion", label: "Descripción" },
    { id: "cobertura", label: "Cobertura" },
    { id: "precios", label: "Precios" },
    { id: "resenas", label: "Reseñas" },
    { id: "preguntas", label: "Preguntas" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_minmax(0,0.9fr)]">
        <div className="min-w-0">
          <div className="card-uniko overflow-hidden">
            <img
              src={servicio.imagen}
              alt={servicio.titulo}
              className="aspect-16/9 w-full object-cover"
            />
            {servicio.recomendado && (
              <div className="absolute left-3 top-3">
                <Etiqueta tono="primary">Recomendado</Etiqueta>
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <h1 className="text-2xl leading-snug sm:text-3xl">{servicio.titulo}</h1>
          <p className="mt-2 text-base font-bold text-brand">Desde {formatearRD(servicio.desde)}</p>
          <div className="mt-2 flex min-w-0 items-center gap-1.5 text-xs font-medium text-foreground">
            <span className="truncate">{servicio.proveedor}</span>
            {servicio.verificado ? <BadgeVerificado texto="" /> : null}
          </div>
          <Estrellas rating={servicio.rating} resenas={servicio.resenas} />
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {servicio.ubicacion}
            </span>
            <span className="inline-flex items-center gap-1 text-primary">
              <CalendarCheck className="h-3.5 w-3.5" /> {servicio.cobertura}
            </span>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Link to="/mensajes" className="btn-base btn-brand">
              Solicitar cotización
            </Link>
            <Link to="/mensajes" className="btn-base btn-primary">
              Contactar por WhatsApp
            </Link>
            <Link to="/mensajes" className="btn-base btn-outline sm:col-span-2">
              Enviar mensaje
            </Link>
          </div>
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
              {servicio.titulo} ofrecido por {servicio.proveedor} en {servicio.ubicacion}.
              Profesional verificado con experiencia comprobada y soporte a través del sistema de
              mensajes de UNIKO-RD.
            </p>
          )}
          {tab === "cobertura" && (
            <p>
              Cobertura: {servicio.cobertura}. Consulta disponibilidad para tu zona específica
              contactando al proveedor.
            </p>
          )}
          {tab === "precios" && (
            <p>
              Precio base desde {formatearRD(servicio.desde)}. El precio final puede variar según la
              complejidad del trabajo, materiales y ubicación. Solicita cotización sin compromiso.
            </p>
          )}
          {tab === "resenas" && (
            <div className="space-y-4">
              <Estrellas rating={servicio.rating} resenas={servicio.resenas} />
              <p>"Excelente trabajo, muy profesional y puntual." — Cliente verificado</p>
              <p>"Lo recomiendo totalmente, gran calidad." — Cliente verificado</p>
            </div>
          )}
          {tab === "preguntas" && (
            <p>Aún no hay preguntas. Envía la tuya al proveedor desde "Contactar".</p>
          )}
        </div>
      </div>

      {relacionados.length && (
        <div className="mt-12">
          <TituloSeccion titulo="Servicios relacionados" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {relacionados.slice(0, 4).map((s) => (
              <TarjetaServicio key={s.id} servicio={s} />
            ))}
          </div>
        </div>
      )}
      <div className="mt-12">
        <TituloSeccion titulo="También te puede interesar" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {servicios
            .filter((s) => s.id !== servicio.id)
            .slice(0, 4)
            .map((s) => (
              <TarjetaServicio key={s.id} servicio={s} />
            ))}
        </div>
      </div>
    </div>
  );
}
