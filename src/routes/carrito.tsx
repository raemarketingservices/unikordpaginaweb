import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { formatearRD } from "@/data/marketplace";
import { useCart } from "@/lib/cart";

export const Route = createFileRoute("/carrito")({
  head: () => ({ meta: [{ title: "Carrito · UNIKO-RD" }, { name: "robots", content: "noindex" }] }),
  component: CarritoPagina,
});

function CarritoPagina() {
  const { items, unidades, total, actualizarCantidad, eliminar, vaciar } = useCart();

  if (!items.length) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <ShoppingCart className="mx-auto h-14 w-14 text-muted-foreground" />
        <h1 className="mt-4 text-2xl">Tu carrito está vacío</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Agrega productos de comercios dominicanos verificados y solicita tu compra desde aquí.
        </p>
        <Link to="/productos" className="btn-base btn-brand mt-6 inline-flex">
          Explorar productos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl">
          Carrito de compras{" "}
          <span className="text-base font-semibold text-muted-foreground">
            ({unidades} {unidades === 1 ? "artículo" : "artículos"})
          </span>
        </h1>
        <button type="button" onClick={vaciar} className="btn-base btn-outline px-4 py-2 text-sm">
          Vaciar carrito
        </button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <ul className="grid gap-3">
          {items.map((item) => (
            <li key={item.id} className="card-uniko flex gap-4 p-4">
              <img
                src={item.imagen}
                alt={item.titulo}
                className="h-24 w-24 shrink-0 rounded-xl object-cover"
                loading="lazy"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{item.titulo}</p>
                <p className="truncate text-xs text-muted-foreground">{item.tienda}</p>
                <p className="mt-1 font-bold text-brand">{formatearRD(item.precio)}</p>
              </div>
              <div className="flex flex-col items-end justify-between gap-2">
                <button
                  type="button"
                  aria-label={`Quitar ${item.titulo} del carrito`}
                  onClick={() => eliminar(item.id)}
                  className="grid h-8 w-8 place-items-center rounded-full text-destructive hover:bg-accent"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-2 rounded-full border border-border px-2 py-1">
                  <button
                    type="button"
                    aria-label="Reducir cantidad"
                    onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}
                    className="grid h-7 w-7 place-items-center rounded-full hover:bg-accent"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm font-bold">{item.cantidad}</span>
                  <button
                    type="button"
                    aria-label="Aumentar cantidad"
                    onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}
                    className="grid h-7 w-7 place-items-center rounded-full hover:bg-accent"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="card-uniko h-fit p-5">
          <h2 className="text-lg font-bold">Resumen</h2>
          <dl className="mt-3 grid gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-semibold">{formatearRD(total)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Envío</dt>
              <dd className="font-semibold text-success">GRATIS</dd>
            </div>
          </dl>
          <div className="mt-3 border-t border-border pt-3">
            <div className="flex items-baseline justify-between">
              <span className="font-bold">Total a pagar:</span>
              <span className="text-xl font-bold text-brand">{formatearRD(total)}</span>
            </div>
          </div>
          <Link to="/checkout" className="btn-base btn-brand mt-4 flex w-full">
            Continuar con la compra
          </Link>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Al continuar enviarás tus datos de contacto para coordinar la entrega.
          </p>
        </aside>
      </div>
    </div>
  );
}
