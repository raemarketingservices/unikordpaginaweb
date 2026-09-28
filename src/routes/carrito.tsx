import { createFileRoute } from "@tanstack/react-router";
import { Proximamente } from "@/components/uniko/Proximamente";

export const Route = createFileRoute("/carrito")({
  head: () => ({ meta: [{ title: "Carrito · UNIKO-RD" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <Proximamente titulo="Carrito de compras" descripcion="Tu carrito llegará pronto." />
  ),
});
