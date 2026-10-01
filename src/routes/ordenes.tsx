import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PanelOrdenes } from "@/components/vendedor/PanelOrdenes";

export const Route = createFileRoute("/ordenes")({
  head: () => ({
    meta: [{ title: "Órdenes · UNIKO-RD" }],
  }),
  component: () => {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <PanelOrdenes modo="seller" />

        <div className="flex flex-wrap gap-3 border-t border-border pt-5">
          <Link to="/vender" className="btn-base btn-outline">
            <ArrowLeft className="h-4 w-4" /> Mi tienda
          </Link>
          <Link to="/cuenta" className="btn-base btn-outline">
            Mi cuenta
          </Link>
        </div>
      </div>
    );
  },
});
