import { Link } from "@tanstack/react-router";
import { Heart, MapPin, Truck, CalendarCheck, Store as StoreIcon, Users, ArrowUpRight, Package, Briefcase } from "lucide-react";
import { formatearRD, type Producto, type Servicio, type Tienda } from "@/data/marketplace";
import { BadgeVerificado, Estrellas, Etiqueta } from "./Primitivos";

export function TarjetaProducto({ producto }: { producto: Producto }) {
  const descuento = producto.precioAnterior
    ? Math.round((1 - producto.precio / producto.precioAnterior) * 100)
    : 0;

  return (
    <article className="card-uniko group flex flex-col overflow-hidden">
      <div className="relative aspect-4/3 overflow-hidden bg-muted">
        {producto.imagen ? <img
          src={producto.imagen}
          alt={producto.titulo}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        /> : <div className="grid h-full place-items-center text-muted-foreground"><Package className="h-10 w-10" /></div>}
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {descuento > 0 ? <Etiqueta>-{descuento}%</Etiqueta> : null}
          {producto.nuevo ? <Etiqueta tono="primary">Nuevo</Etiqueta> : null}
        </div>
        <button
          type="button"
          aria-label="Agregar a favoritos"
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-card/90 text-primary shadow-sm transition-colors hover:text-brand"
        >
          <Heart className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold text-foreground">{producto.titulo}</h3>
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-lg font-bold text-brand">{formatearRD(producto.precio)}</span>
          {producto.precioAnterior ? (
            <span className="text-xs font-medium text-muted-foreground line-through">
              {formatearRD(producto.precioAnterior)}
            </span>
          ) : null}
        </div>
        <Estrellas rating={producto.rating} resenas={producto.resenas} />
        <div className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <StoreIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{producto.tienda}</span>
          {producto.verificado ? <BadgeVerificado texto="" /> : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {producto.ubicacion}
          </span>
          {producto.envioNacional ? (
            <span className="inline-flex items-center gap-1 text-primary">
              <Truck className="h-3.5 w-3.5" />
              Envíos a todo el país
            </span>
          ) : null}
        </div>
        <div className="mt-auto flex gap-2 pt-2">
          <Link
            to="/productos/$productoId"
            params={{ productoId: producto.id }}
            className="btn-base btn-brand flex-1 px-3 py-2 text-[13px]"
          >
            Ver producto
          </Link>
        </div>
      </div>
    </article>
  );
}

export function TarjetaServicio({ servicio }: { servicio: Servicio }) {
  return (
    <article className="card-uniko group flex flex-col overflow-hidden">
      <div className="relative aspect-16/9 overflow-hidden bg-muted">
        {servicio.imagen ? <img
          src={servicio.imagen}
          alt={servicio.titulo}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        /> : <div className="grid h-full place-items-center text-muted-foreground"><Briefcase className="h-10 w-10" /></div>}
        {servicio.recomendado ? (
          <div className="absolute left-3 top-3">
            <Etiqueta tono="primary">Recomendado</Etiqueta>
          </div>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold text-foreground">{servicio.titulo}</h3>
        <p className="text-base font-bold text-brand">Desde {formatearRD(servicio.desde)}</p>
        <div className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-foreground">
          <span className="truncate">{servicio.proveedor}</span>
          {servicio.verificado ? <BadgeVerificado texto="" /> : null}
        </div>
        <Estrellas rating={servicio.rating} resenas={servicio.resenas} />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {servicio.ubicacion}
          </span>
          <span className="inline-flex items-center gap-1 text-primary">
            <CalendarCheck className="h-3.5 w-3.5" />
            {servicio.cobertura}
          </span>
        </div>
        <div className="mt-auto flex gap-2 pt-2">
          <Link
            to="/servicios/$servicioId"
            params={{ servicioId: servicio.id }}
            className="btn-base btn-brand flex-1 justify-between px-4 py-2.5 text-sm font-semibold transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Ver servicio
            <ArrowUpRight className="h-4 w-4 shrink-0" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function TarjetaTienda({ tienda }: { tienda: Tienda }) {
  return (
    <article className="card-uniko overflow-hidden">
      <div className="h-24 overflow-hidden bg-muted">
        {tienda.portada ? <img src={tienda.portada} alt="" loading="lazy" className="h-full w-full object-cover" /> :
          <div className="grid h-full place-items-center text-muted-foreground"><StoreIcon className="h-8 w-8" /></div>}
      </div>
      <div className="px-4 pb-4">
        {tienda.logo ? <img
          src={tienda.logo}
          alt={tienda.nombre}
          loading="lazy"
          className="-mt-8 h-16 w-16 rounded-2xl border-4 border-card object-cover"
        /> : <div className="-mt-8 grid h-16 w-16 place-items-center rounded-2xl border-4 border-card bg-muted text-muted-foreground"><StoreIcon className="h-6 w-6" /></div>}
        <div className="mt-2 flex min-w-0 items-center gap-1.5">
          <h3 className="truncate text-sm font-bold text-foreground">{tienda.nombre}</h3>
          {tienda.verificado ? <BadgeVerificado texto="" /> : null}
        </div>
        <p className="text-xs text-muted-foreground">
          {tienda.categoria} · {tienda.ubicacion}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Estrellas rating={tienda.rating} resenas={tienda.resenas} />
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {tienda.seguidores.toLocaleString("es-DO")} seguidores
          </span>
        </div>
        <div className="mt-3 flex gap-2">
          <Link
            to="/tiendas/$tiendaId"
            params={{ tiendaId: tienda.id }}
            className="btn-base btn-primary flex-1 px-3 py-2 text-[13px]"
          >
            Ver tienda
          </Link>
          <button type="button" className="btn-base btn-outline px-3 py-2 text-[13px]">
            Seguir
          </button>
        </div>
      </div>
    </article>
  );
}
