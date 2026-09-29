import { createFileRoute, Link } from "@tanstack/react-router";
import { PanelOrdenes } from "@/components/vendedor/PanelOrdenes";

export const Route = createFileRoute("/ordenes")({
  head: () => ({
    meta: [{ title: "Órdenes · UNIKO-RD" }],
  }),
  component: () => {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <PanelOrdenes modo="seller" />
        <Link to="/vender" className="mt-4 inline-block btn-outline">
          Volver a la tienda
        </Link>
      </div>
    )
  },
})