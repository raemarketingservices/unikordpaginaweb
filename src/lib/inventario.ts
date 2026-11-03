import type { ItemCarrito } from "@/lib/cart";
import type { Producto } from "@/data/marketplace";

/** Con pocas unidades se avisa: es el dato que evita un pedido fallido. */
const UMBRAL_POCAS = 5;

export type EstadoInventario =
  | { controlada: false }
  | {
      controlada: true;
      unidades: number;
      agotado: boolean;
      pocas: boolean;
      texto: string;
      clases: string;
    };

/**
 * Una fila sin `inventario` no es un agotado: es una tienda que no lleva
 * existencias (o un catálogo viejo). Aquí devuelve `controlada: false` y quien
 * pinta la ficha debe limitarse a no afirmar nada.
 */
export function estadoInventario(producto: {
  inventario?: Producto["inventario"];
}): EstadoInventario {
  if (!producto.inventario) return { controlada: false };
  const unidades = producto.inventario.unidades;
  const agotado = unidades <= 0;
  const pocas = !agotado && unidades <= UMBRAL_POCAS;
  return {
    controlada: true,
    unidades,
    agotado,
    pocas,
    texto: agotado ? "Agotado" : pocas ? `¡Solo quedan ${unidades}!` : `${unidades} disponibles`,
    clases: agotado ? "text-destructive" : pocas ? "text-brand" : "text-success",
  };
}

/**
 * Lo que todavía cabe en el carrito: las unidades de la tienda menos lo que ya
 * se llevó en esta sesión. Sin control, no hay tope.
 */
export function cantidadDisponible(
  producto: Pick<Producto, "id" | "inventario">,
  items: ItemCarrito[]
): number | null {
  if (!producto.inventario) return null;
  const enCarrito = items.find((i) => i.id === producto.id)?.cantidad ?? 0;
  return Math.max(0, producto.inventario.unidades - enCarrito);
}
