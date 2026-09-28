import { createFileRoute } from "@tanstack/react-router";
import { Proximamente } from "@/components/uniko/Proximamente";

export const Route = createFileRoute("/ayuda")({
  head: () => ({
    meta: [{ title: "Centro de ayuda · UNIKO-RD" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <Proximamente
      titulo="Centro de ayuda"
      descripcion="Preguntas frecuentes y guías llegarán pronto."
    />
  ),
});
