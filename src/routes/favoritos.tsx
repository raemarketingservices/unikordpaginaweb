import { createFileRoute } from "@tanstack/react-router";
import { Proximamente } from "@/components/uniko/Proximamente";

export const Route = createFileRoute("/favoritos")({
  head: () => ({
    meta: [{ title: "Favoritos · UNIKO-RD" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <Proximamente titulo="Mis favoritos" descripcion="Tus productos guardados llegarán pronto." />
  ),
});
