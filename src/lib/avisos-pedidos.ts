// Avisos de pedidos nuevos en vivo para vendedores y admin (Supabase Realtime + RLS).
import { useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { supabase } from "./supabase";
import { formatearRD } from "@/data/marketplace";

let pendientes = 0;
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((f) => f());

export function marcarPedidosVistos() {
  if (pendientes === 0) return;
  pendientes = 0;
  avisar();
}

/** Cuántos pedidos nuevos llegaron desde la última visita a /ordenes. */
export function usePedidosNuevos() {
  return useSyncExternalStore(
    (f) => {
      oyentes.add(f);
      return () => oyentes.delete(f);
    },
    () => pendientes,
    () => 0,
  );
}

/** Escucha inserciones en purchase_requests mientras haya sesión. */
export function useAvisosPedidos(userId: string | null, irAOrdenes: () => void) {
  useEffect(() => {
    if (!userId) return;
    const canal = supabase
      .channel(`uniko-pedidos-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "purchase_requests" }, (p) => {
        const o = p.new as { user_id?: string | null; full_name?: string; total?: number | null };
        if (o.user_id === userId) return; // mi propia compra no es un aviso de venta
        pendientes += 1;
        avisar();
        window.dispatchEvent(new Event("uniko:pedido-nuevo"));
        toast.success(`Nuevo pedido de ${o.full_name ?? "un cliente"}`, {
          description: o.total ? `Total ${formatearRD(Number(o.total))}` : undefined,
          duration: 15000,
          action: { label: "Ver pedido", onClick: irAOrdenes },
        });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [userId, irAOrdenes]);
}
