import { createFileRoute } from "@tanstack/react-router";
import { Proximamente } from "@/components/uniko/Proximamente";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [{ title: "Checkout · UNIKO-RD" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <Proximamente titulo="Finalizar compra" descripcion="El proceso de pago llegará pronto." />
  ),
});
