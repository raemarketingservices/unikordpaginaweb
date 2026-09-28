import { createFileRoute } from "@tanstack/react-router";
import { Proximamente } from "@/components/uniko/Proximamente";

export const Route = createFileRoute("/legal")({
  head: () => ({ meta: [{ title: "Legal · UNIKO-RD" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <Proximamente
      titulo="Términos y privacidad"
      descripcion="Documentos legales llegarán pronto."
    />
  ),
});
