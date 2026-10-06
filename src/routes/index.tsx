import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  Truck,
  Lock,
  Store,
  Briefcase,
  ArrowRight,
  MapPin,
  Heart,
  Star,
  Zap,
  Package,
  Users,
  Sparkles,
  Car,
  Navigation,
  Calendar,
} from "lucide-react";
import heroImg from "@/assets/hero-uniko.jpg";
import { GrillaCategorias } from "@/components/uniko/Categorias";
import { TarjetaProducto, TarjetaServicio, TarjetaTienda } from "@/components/uniko/Tarjetas";
import { TituloSeccion } from "@/components/uniko/Primitivos";
import { fetchHome, type HomeData } from "@/lib/queries";
import type { PageBlockRow } from "@/lib/types";
import type { Categoria, Producto, Servicio, Tienda } from "@/data/marketplace";
import { notFound } from "@tanstack/react-router";
import { LOCAL_CATALOG } from "@/lib/local-catalog";
import { getLocalData } from "@/lib/local-db";
import { MapaRD } from "@/components/MapaRD";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UNIKO-RD · Todo lo que buscas. En un solo lugar." },
      {
        name: "description",
        content:
          "Marketplace dominicano de productos y servicios: compra en tiendas locales, contrata profesionales verificados y vende en toda RD.",
      },
      { property: "og:title", content: "UNIKO-RD · Marketplace Dominicano" },
      {
        property: "og:description",
        content:
          "Productos, servicios, tiendas locales y profesionales de toda República Dominicana.",
      },
      { property: "og:image", content: "/og-image.png" },
    ],
  }),
  loader: async () => ({ data: await fetchHome() }),
  component: Inicio,
});

function Inicio() {
  const { data } = Route.useLoaderData();
  if (!data.bloques.length) return <InicioEstatico data={data} />;
  return <InicioPorBloques data={data} />;
}

// ====== FALLBACK ESTÁTICO (código original) ======
function InicioEstatico({ data }: { data: HomeData }) {
  const home = LOCAL_CATALOG ? getLocalData().home : null;
  const { categorias, productos, servicios, tiendas } = data;
  const ofertas = productos.filter((p: Producto) => p.precioAnterior);
  const masVendidos = productos.filter((p: Producto) => p.masVendido);
  const nuevos = productos.filter((p: Producto) => p.nuevo);

  return (
    <div>
      {/* HERO */}
      <section className="border-b border-border bg-gradient-to-b from-accent/60 to-background">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 lg:grid-cols-2 lg:py-16">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">
              Marketplace Dominicano
            </p>
            <h1 className="mt-3 text-3xl leading-tight sm:text-4xl lg:text-5xl">
              {home ? home.headline : <>Todo lo que buscas.<br />En un solo lugar.</>}
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground">
              {home?.subtitle ?? "Compra productos, descubre negocios dominicanos y encuentra profesionales para todo lo que necesitas."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/productos" className="btn-base btn-brand">
                Explorar productos
              </Link>
              <Link to="/servicios" className="btn-base btn-primary">
                Explorar servicios
              </Link>
              <Link to="/vender" className="btn-base btn-outline">
                Empieza a vender
              </Link>
            </div>
            <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-border pt-6">
              {[
                { k: "+12,000", v: "Productos publicados" },
                { k: "+2,500", v: "Servicios y profesionales" },
                { k: "32", v: "Provincias con cobertura" },
              ].map((s) => (
                <div key={s.v} className="min-w-0">
                  <dt className="text-lg font-bold text-primary sm:text-xl">{s.k}</dt>
                  <dd className="text-[11px] font-medium text-muted-foreground sm:text-xs">
                    {s.v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative overflow-hidden rounded-3xl shadow-[var(--shadow-card-hover)]">
            <img
              src={heroImg}
              alt="Negocios y profesionales dominicanos vendiendo en UNIKO-RD"
              width={1280}
              height={960}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* BANNER DE RENTA DE VEHÍCULOS */}
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="relative overflow-hidden rounded-3xl shadow-2xl">
          {/* Imagen de fondo - Carretera */}
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1200&q=80"
              alt="Carretera"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/85 to-transparent"></div>
          </div>

          {/* Contenido */}
          <div className="relative grid gap-8 p-8 md:grid-cols-2 md:items-center md:p-12">
            <div className="text-white">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-bold backdrop-blur-sm">
                <Car className="h-5 w-5" />
                Nuevo en UNIKO-RD
              </div>
              <h2 className="mt-4 text-3xl font-bold leading-tight md:text-4xl">
                Renta el vehículo perfecto para tu viaje
              </h2>
              <p className="mt-4 text-lg opacity-95">
                Encuentra desde sedanes hasta vans. Con GPS, seguro incluido y seguimiento en tiempo real.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-white/20 p-2 backdrop-blur-sm">
                    <Navigation className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-semibold">Tracking GPS</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-white/20 p-2 backdrop-blur-sm">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-semibold">Reserva fácil</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-white/20 p-2 backdrop-blur-sm">
                    <Car className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-semibold">50+ vehículos</span>
                </div>
              </div>
              <Link
                to="/vehiculos"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 font-bold text-primary shadow-lg transition-transform hover:scale-105"
              >
                Ver vehículos disponibles
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>

            {/* Tarjeta de precio flotante */}
            <div className="relative flex justify-center md:justify-end">
              <div className="rounded-2xl bg-white p-6 shadow-2xl">
                <div className="flex items-center gap-3 border-b pb-4">
                  <div className="rounded-full bg-primary/10 p-3">
                    <Car className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">Desde</p>
                    <p className="text-3xl font-bold text-primary">RD$ 1,500</p>
                    <p className="text-sm text-muted-foreground">por día</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <span>Disponibilidad inmediata</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <span>Cancelación gratis</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <span>Seguro incluido</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAPA DE REPÚBLICA DOMINICANA */}
      <div className="mx-auto max-w-7xl px-4 py-10">
        <MapaRD />
      </div>

      {/* CONFIANZA */}
      <section className="section-muted border-b border-border">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-6 lg:grid-cols-4">
          {[
            { icono: ShieldCheck, t: "Compras seguras" },
            { icono: Store, t: "Vendedores confiables" },
            { icono: Lock, t: "Pagos protegidos" },
            { icono: Truck, t: "Envíos a todo el país" },
          ].map(({ icono: Icono, t }) => (
            <div key={t} className="flex min-w-0 items-center gap-2">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-card text-primary shadow-sm">
                <Icono className="h-5 w-5" />
              </span>
              <span className="truncate text-sm font-semibold text-foreground">{t}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10">
        <TituloSeccion
          titulo="Categorías populares"
          descripcion="Más productos. Más oportunidades. Un mismo lugar."
          accion={
            <Link
              to="/categorias"
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
            >
              Ver todas <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
        <GrillaCategorias lista={categorias.slice(0, 12)} />
      </div>

      <Seccion
        titulo="Ofertas destacadas"
        descripcion="Descuentos activos de tiendas verificadas"
        verMas={{ to: "/ofertas", label: "Ver ofertas" }}
      >
        {ofertas.slice(0, 4).map((p: Producto) => (
          <TarjetaProducto key={p.id} producto={p} />
        ))}
      </Seccion>
      <Seccion
        titulo="Servicios cerca de ti"
        descripcion="Profesionales y técnicos disponibles en tu provincia"
        verMas={{ to: "/servicios", label: "Ver servicios" }}
        fondo
      >
        {servicios.slice(0, 4).map((s: Servicio) => (
          <TarjetaServicio key={s.id} servicio={s} />
        ))}
      </Seccion>
      <Seccion
        titulo="Productos para ti"
        descripcion="Seleccionados según lo más buscado en RD"
        verMas={{ to: "/productos", label: "Ver productos" }}
      >
        {productos.slice(0, 4).map((p: Producto) => (
          <TarjetaProducto key={p.id} producto={p} />
        ))}
      </Seccion>
      <Seccion
        titulo="Tiendas destacadas"
        descripcion="Negocios dominicanos con buena reputación"
        verMas={{ to: "/tiendas", label: "Ver tiendas" }}
        fondo
      >
        {tiendas.map((t: Tienda) => (
          <TarjetaTienda key={t.id} tienda={t} />
        ))}
      </Seccion>
      <Seccion
        titulo="Profesionales recomendados"
        descripcion="Proveedores con mejores calificaciones"
        verMas={{ to: "/servicios", label: "Ver profesionales" }}
      >
        {servicios
          .filter((s: Servicio) => s.recomendado)
          .slice(0, 4)
          .map((s: Servicio) => (
            <TarjetaServicio key={s.id} servicio={s} />
          ))}
      </Seccion>

      {/* BANNERS */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl bg-primary p-8 text-primary-foreground">
            <Store className="h-8 w-8" />
            <h2 className="mt-4 text-2xl text-white">¿Tienes un negocio?</h2>
            <p className="mt-2 text-sm opacity-90">
              Abre tu tienda en UNIKO-RD y llega a clientes de todo el país.
            </p>
            <Link to="/vender" className="btn-base btn-ghost-light mt-5">
              Crear mi tienda
            </Link>
          </div>
          <div className="rounded-3xl bg-brand p-8 text-brand-foreground">
            <Briefcase className="h-8 w-8" />
            <h2 className="mt-4 text-2xl text-white">¿Ofreces un servicio?</h2>
            <p className="mt-2 text-sm opacity-90">Convierte tus habilidades en oportunidades.</p>
            <Link to="/vender" className="btn-base btn-ghost-light mt-5">
              Publicar mi servicio
            </Link>
          </div>
        </div>
      </section>

      <Seccion titulo="Lo más vendido" descripcion="Los favoritos de los dominicanos" fondo>
        {masVendidos.map((p: Producto) => (
          <TarjetaProducto key={p.id} producto={p} />
        ))}
      </Seccion>
      <Seccion titulo="Nuevos en UNIKO-RD" descripcion="Recién publicados por nuestros vendedores">
        {nuevos.map((p: Producto) => (
          <TarjetaProducto key={p.id} producto={p} />
        ))}
      </Seccion>
    </div>
  );
}

// ====== RENDERIZADOR POR BLOQUES ======
function InicioPorBloques({
  data,
}: {
  data: {
    bloques: PageBlockRow[];
    categorias: Categoria[];
    productos: Producto[];
    servicios: Servicio[];
    tiendas: Tienda[];
  };
}) {
  const { bloques, categorias, productos, servicios, tiendas } = data;
  const ofertas = productos.filter((p) => p.precioAnterior);
  const masVendidos = productos.filter((p) => p.masVendido);
  const nuevos = productos.filter((p) => p.nuevo);

  return (
    <div>
      {bloques.map((b) => (
        <Bloque
          key={b.id}
          bloque={b}
          data={{ categorias, productos, servicios, tiendas, ofertas, masVendidos, nuevos }}
        />
      ))}
    </div>
  );
}

function Bloque({ bloque, data }: { bloque: PageBlockRow; data: any }) {
  const cfg = (bloque.config ?? {}) as Record<string, unknown>;
  const habilitado = bloque.enabled ?? true;
  if (!habilitado) return null;

  switch (bloque.type) {
    case "hero":
      return <HeroBloque bloque={bloque} cfg={cfg as any} />;
    case "trust_bar":
      return <TrustBloque cfg={cfg as any} />;
    case "categories":
      return <CategoriasBloque bloque={bloque} cfg={cfg as any} data={data} />;
    case "product_section":
      return <SeccionProductosBloque bloque={bloque} cfg={cfg as any} data={data} />;
    case "service_section":
      return <SeccionServiciosBloque bloque={bloque} cfg={cfg as any} data={data} />;
    case "store_section":
      return <SeccionTiendasBloque bloque={bloque} cfg={cfg as any} data={data} />;
    case "cta_banners":
      return <CtaBannersBloque cfg={cfg as any} />;
    default:
      return null;
  }
}

// --- Componentes de bloque individuales ---
function HeroBloque({ bloque, cfg }: { bloque: PageBlockRow; cfg: any }) {
  const eyebrow = (cfg.eyebrow ?? "Marketplace Dominicano") as string;
  const image = (cfg.image ?? "") as string;
  const buttons = (cfg.buttons ?? []) as { label?: string; to?: string; style?: string }[];
  const stats = (cfg.stats ?? []) as { k?: string; v?: string }[];

  return (
    <section className="border-b border-border bg-gradient-to-b from-accent/60 to-background">
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 lg:grid-cols-2 lg:py-16">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">{eyebrow}</p>
          <h1 className="mt-3 whitespace-pre-line text-3xl leading-tight sm:text-4xl lg:text-5xl">
            {bloque.title?.replace(/<br\s*\/?\s*>/gi, "\n") ??
              "Todo lo que buscas. En un solo lugar."}
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground">
            {bloque.subtitle ??
              "Compra productos, descubre negocios dominicanos y encuentra profesionales para todo lo que necesitas."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {buttons.map((b, i) => (
              <Link key={i} to={b.to ?? "/"} className={`btn-base btn-${b.style ?? "brand"}`}>
                {b.label}
              </Link>
            ))}
          </div>
          <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-border pt-6">
            {stats.map((s, i) => (
              <div key={i} className="min-w-0">
                <dt className="text-lg font-bold text-primary sm:text-xl">{s.k}</dt>
                <dd className="text-[11px] font-medium text-muted-foreground sm:text-xs">{s.v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="relative overflow-hidden rounded-3xl shadow-[var(--shadow-card-hover)]">
          {image ? (
            <img src={image} alt={bloque.title ?? "Hero"} className="h-full w-full object-cover" />
          ) : (
            <img
              src={heroImg}
              alt="Negocios y profesionales dominicanos vendiendo en UNIKO-RD"
              width={1280}
              height={960}
              className="h-full w-full object-cover"
            />
          )}
        </div>
      </div>
    </section>
  );
}

function TrustBloque({ cfg }: { cfg: any }) {
  const items = (cfg.items ?? []) as { icon?: string; text?: string }[];
  const Iconos: Record<string, any> = {
    ShieldCheck,
    Store,
    Lock,
    Truck,
    Briefcase,
    Heart,
    Star,
    Zap,
    Package,
    Users,
    Sparkles,
    MapPin,
  };
  return (
    <section className="section-muted border-b border-border">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-6 lg:grid-cols-4">
        {items.map(({ icon, text }, i) => {
          const Icon = icon && Iconos[icon] ? Iconos[icon] : Package;
          return (
            <div key={i} className="flex min-w-0 items-center gap-2">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-card text-primary shadow-sm">
                <Icon className="h-5 w-5" />
              </span>
              <span className="truncate text-sm font-semibold text-foreground">{text ?? ""}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CategoriasBloque({ bloque, cfg, data }: { bloque: PageBlockRow; cfg: any; data: any }) {
  const limit = (cfg.limit ?? 12) as number;
  const link = cfg.link as { to?: string; label?: string } | undefined;
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <TituloSeccion
        titulo={bloque.title ?? "Categorías populares"}
        descripcion={bloque.subtitle ?? "Más productos. Más oportunidades. Un mismo lugar."}
        accion={
          link ? (
            <Link
              to={link.to ?? "/categorias"}
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
            >
              {link.label ?? "Ver todas"} <ArrowRight className="h-4 w-4" />
            </Link>
          ) : undefined
        }
      />
      <GrillaCategorias lista={data.categorias.slice(0, limit)} />
    </div>
  );
}

function filtrarProductos(lista: Producto[], filtro?: string) {
  if (!filtro || filtro === "all") return lista;
  if (filtro === "offers") return lista.filter((p) => p.precioAnterior);
  if (filtro === "best_seller") return lista.filter((p) => p.masVendido);
  if (filtro === "is_new") return lista.filter((p) => p.nuevo);
  if (filtro === "featured") return lista.filter((p) => p.destacado);
  return lista;
}

function filtrarServicios(lista: Servicio[], filtro?: string) {
  if (!filtro || filtro === "all") return lista;
  if (filtro === "recommended") return lista.filter((s) => s.recomendado);
  return lista;
}

function filtrarTiendas(lista: Tienda[], filtro?: string) {
  if (!filtro || filtro === "all") return lista;
  if (filtro === "featured") return lista.filter((t) => t.destacado);
  return lista;
}

function SeccionProductosBloque({
  bloque,
  cfg,
  data,
}: {
  bloque: PageBlockRow;
  cfg: any;
  data: any;
}) {
  const filtro = (cfg.filter ?? "all") as string;
  const limit = (cfg.limit ?? 4) as number;
  const fondo = (cfg.fondo ?? false) as boolean;
  const link = cfg.link as { to?: string; label?: string } | undefined;
  const items = filtrarProductos(data.productos, filtro).slice(0, limit);
  return (
    <Seccion
      titulo={bloque.title ?? ""}
      descripcion={bloque.subtitle ?? undefined}
      verMas={link ? { to: link.to!, label: link.label! } : undefined}
      fondo={fondo}
    >
      {items.map((p) => (
        <TarjetaProducto key={p.id} producto={p} />
      ))}
    </Seccion>
  );
}

function SeccionServiciosBloque({
  bloque,
  cfg,
  data,
}: {
  bloque: PageBlockRow;
  cfg: any;
  data: any;
}) {
  const filtro = (cfg.filter ?? "all") as string;
  const limit = (cfg.limit ?? 4) as number;
  const fondo = (cfg.fondo ?? false) as boolean;
  const link = cfg.link as { to?: string; label?: string } | undefined;
  const items = filtrarServicios(data.servicios, filtro).slice(0, limit);
  return (
    <Seccion
      titulo={bloque.title ?? ""}
      descripcion={bloque.subtitle ?? undefined}
      verMas={link ? { to: link.to!, label: link.label! } : undefined}
      fondo={fondo}
    >
      {items.map((s) => (
        <TarjetaServicio key={s.id} servicio={s} />
      ))}
    </Seccion>
  );
}

function SeccionTiendasBloque({
  bloque,
  cfg,
  data,
}: {
  bloque: PageBlockRow;
  cfg: any;
  data: any;
}) {
  const filtro = (cfg.filter ?? "featured") as string;
  const limit = (cfg.limit ?? 4) as number;
  const fondo = (cfg.fondo ?? false) as boolean;
  const link = cfg.link as { to?: string; label?: string } | undefined;
  const items = filtrarTiendas(data.tiendas, filtro).slice(0, limit);
  return (
    <Seccion
      titulo={bloque.title ?? ""}
      descripcion={bloque.subtitle ?? undefined}
      verMas={link ? { to: link.to!, label: link.label! } : undefined}
      fondo={fondo}
    >
      {items.map((t) => (
        <TarjetaTienda key={t.id} tienda={t} />
      ))}
    </Seccion>
  );
}

function CtaBannersBloque({ cfg }: { cfg: any }) {
  const banners = (cfg.banners ?? []) as {
    icon?: string;
    title?: string;
    text?: string;
    button_label?: string;
    to?: string;
    color?: string;
  }[];
  const Iconos: Record<string, any> = {
    Store,
    Briefcase,
    ShieldCheck,
    Heart,
    Star,
    Zap,
    Package,
    Users,
    Sparkles,
    MapPin,
  };
  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="grid gap-4 lg:grid-cols-2">
        {banners.map((b, i) => {
          const Icon = b.icon && Iconos[b.icon] ? Iconos[b.icon] : Store;
          return (
            <div
              key={i}
              className={`rounded-3xl p-8 ${b.color === "brand" ? "bg-brand text-brand-foreground" : "bg-primary text-primary-foreground"}`}
            >
              <Icon className="h-8 w-8" />
              <h2 className="mt-4 text-2xl">{b.title ?? ""}</h2>
              <p className="mt-2 text-sm opacity-90">{b.text ?? ""}</p>
              <Link to={b.to ?? "/vender"} className="btn-base btn-ghost-light mt-5">
                {b.button_label ?? "Ver más"}
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Seccion reutilizada
function Seccion({
  titulo,
  descripcion,
  verMas,
  fondo,
  children,
}: {
  titulo: string;
  descripcion?: string | undefined;
  verMas?: { to: string; label: string } | undefined;
  fondo?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={fondo ? "section-muted border-y border-border" : ""}>
      <div className="mx-auto max-w-7xl px-4 py-10">
        <TituloSeccion
          titulo={titulo}
          descripcion={descripcion}
          accion={
            verMas ? (
              <Link
                to={verMas.to}
                className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
              >
                {verMas.label} <ArrowRight className="h-4 w-4" />
              </Link>
            ) : undefined
          }
        />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{children}</div>
      </div>
    </section>
  );
}
