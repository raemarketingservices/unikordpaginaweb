import { useState } from "react";
import { toast } from "sonner";
import { PackageCheck, Truck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { provincias } from "@/data/marketplace";

/** Bloque del detalle de orden: crea la guía en Sacha Pack o muestra la ya creada. */
export function EnvioSacha({
  orden,
  onEnviado,
}: {
  orden: { id: string; province?: string | null; sacha_tracking?: string | null; sacha_sent_at?: string | null; status: string };
  onEnviado: (tracking: string, province: string) => void;
}) {
  const [provincia, setProvincia] = useState(orden.province ?? "");
  const [enviando, setEnviando] = useState(false);

  if (orden.sacha_tracking) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/10 p-3 text-sm">
        <PackageCheck className="h-5 w-5 shrink-0 text-success" />
        <div>
          <p className="font-semibold">Enviado con Sacha Pack</p>
          <p className="text-xs text-muted-foreground">
            Guía {orden.sacha_tracking}
            {orden.sacha_sent_at && ` · ${new Date(orden.sacha_sent_at).toLocaleString("es-DO")}`}
          </p>
        </div>
      </div>
    );
  }
  if (orden.status === "cancelada") return null;

  const enviar = async () => {
    if (!provincia) return void toast.error("Elige la provincia de entrega.");
    setEnviando(true);
    try {
      const { data } = await supabase.auth.getSession();
      const r = await fetch("/api/delivery/sacha", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ orderId: orden.id, province: provincia }),
      });
      const res = (await r.json().catch(() => ({}))) as { tracking?: string; error?: string };
      if (!r.ok || !res.tracking) throw new Error(res.error ?? `Error ${r.status}`);
      toast.success(`Guía creada en Sacha Pack: ${res.tracking}`);
      onEnviado(res.tracking, provincia);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear la guía.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="grid gap-2 rounded-xl border border-border p-3">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary">
        <Truck className="h-4 w-4" /> Delivery con Sacha Pack
      </p>
      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Provincia de entrega"
          className="select-uniko min-w-0 flex-1"
          value={provincia}
          onChange={(e) => setProvincia(e.target.value)}
        >
          <option value="">Provincia de entrega…</option>
          {provincias.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <button type="button" className="btn-base btn-brand" onClick={() => void enviar()} disabled={enviando}>
          {enviando ? "Creando guía…" : "Enviar con Sacha Pack"}
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Crea la guía «pendiente» en Sacha Pack (pago contra entrega) y marca la orden como enviada.
      </p>
    </div>
  );
}
