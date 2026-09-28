import { createFileRoute } from "@tanstack/react-router";
import { Proximamente } from "@/components/uniko/Proximamente";

export const Route = createFileRoute("/mensajes")({
  head: () => ({
    meta: [{ title: "Mensajes · UNIKO-RD" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <Proximamente titulo="Mensajes" descripcion="Tu bandeja de mensajes llegará pronto." />
  ),
});
