import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Producto } from "@/data/marketplace";

export type ItemCarrito = {
  id: string;
  titulo: string;
  precio: number;
  imagen: string;
  tienda: string;
  cantidad: number;
};

type CartState = {
  items: ItemCarrito[];
  unidades: number;
  total: number;
  agregar: (producto: Producto, cantidad?: number) => void;
  actualizarCantidad: (id: string, cantidad: number) => void;
  eliminar: (id: string) => void;
  vaciar: () => void;
};

const CartContext = createContext<CartState | null>(null);
const CLAVE = "uniko_carrito_v1";

function leerStorage(): ItemCarrito[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CLAVE);
    if (!raw) return [];
    const datos: unknown = JSON.parse(raw);
    if (!Array.isArray(datos)) return [];
    return datos.filter(
      (i): i is ItemCarrito =>
        !!i &&
        typeof i === "object" &&
        typeof (i as ItemCarrito).id === "string" &&
        typeof (i as ItemCarrito).titulo === "string" &&
        typeof (i as ItemCarrito).precio === "number" &&
        typeof (i as ItemCarrito).cantidad === "number",
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const cargado = useRef(false);

  useEffect(() => {
    setItems(leerStorage());
    cargado.current = true;
  }, []);

  useEffect(() => {
    if (!cargado.current || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(CLAVE, JSON.stringify(items));
    } catch {
      // localStorage lleno o no disponible: el carrito sigue vivo en memoria
    }
  }, [items]);

  const agregar = (producto: Producto, cantidad = 1) => {
    setItems((prev) => {
      const existente = prev.find((i) => i.id === producto.id);
      if (existente) {
        return prev.map((i) =>
          i.id === producto.id ? { ...i, cantidad: i.cantidad + cantidad } : i,
        );
      }
      return [
        ...prev,
        {
          id: producto.id,
          titulo: producto.titulo,
          precio: producto.precio,
          imagen: producto.imagen,
          tienda: producto.tienda,
          cantidad,
        },
      ];
    });
  };

  const actualizarCantidad = (id: string, cantidad: number) => {
    setItems((prev) =>
      cantidad <= 0
        ? prev.filter((i) => i.id !== id)
        : prev.map((i) => (i.id === id ? { ...i, cantidad } : i)),
    );
  };

  const eliminar = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const vaciar = () => setItems([]);

  const unidades = items.reduce((suma, i) => suma + i.cantidad, 0);
  const total = items.reduce((suma, i) => suma + i.precio * i.cantidad, 0);

  const valor: CartState = {
    items,
    unidades,
    total,
    agregar,
    actualizarCantidad,
    eliminar,
    vaciar,
  };

  return <CartContext.Provider value={valor}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return ctx;
}
