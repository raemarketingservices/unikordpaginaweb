import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bot, Save } from "lucide-react";
import { fetchConfigChatbot, fetchTiendasAdmin, guardarConfigChatbot } from "@/lib/queries";
import type { ChatbotSettingsRow, StoreRow } from "@/lib/types";

export function ConfigChatbot() {
  const [cfg, setCfg] = useState<ChatbotSettingsRow | null>(null);
  const [tiendas, setTiendas] = useState<StoreRow[]>([]);
  const [todas, setTodas] = useState(true);
  const [seleccionadas, setSeleccionadas] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    Promise.all([fetchConfigChatbot(), fetchTiendasAdmin()])
      .then(([c, t]) => {
        if (!activo) return;
        const permitidas = c.allowed_stores ?? [];
        const esTodas = permitidas.includes("*");
        setCfg(c);
        setTodas(esTodas);
        setSeleccionadas(esTodas ? [] : permitidas);
        setTiendas(t);
        setCargando(false);
      })
      .catch((err: unknown) => {
        toast.error(err instanceof Error ? err.message : "No pudimos cargar la configuración.");
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  const alternarTienda = (id: string) => {
    setSeleccionadas((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const guardar = async () => {
    if (!cfg || guardando) return;
    setGuardando(true);
    try {
      await guardarConfigChatbot({
        enabled: cfg.enabled,
        greeting: cfg.greeting,
        allowed_stores: todas ? ["*"] : seleccionadas,
      });
      toast.success("Configuración del chatbot guardada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No pudimos guardar.");
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">Cargando configuración…</div>
    );
  }

  if (!cfg) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        No se pudo cargar la configuración.
      </div>
    );
  }

  return (
    <div className="grid gap-6 p-4 md:grid-cols-2">
      <div className="grid gap-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <Bot className="h-5 w-5 text-brand" /> Chatbot UNIKO
        </h2>

        <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3">
          <span className="text-sm font-semibold">Chatbot activo en el sitio</span>
          <input
            type="checkbox"
            checked={cfg.enabled}
            onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })}
            className="h-5 w-5 rounded border-border accent-brand"
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-primary">
            Mensaje de saludo
          </span>
          <textarea
            value={cfg.greeting}
            onChange={(e) => setCfg({ ...cfg, greeting: e.target.value })}
            className="input-uniko min-h-24 resize-y"
            maxLength={400}
          />
        </label>

        <button
          type="button"
          onClick={guardar}
          disabled={guardando}
          className="btn-base btn-brand justify-self-start"
        >
          <Save className="h-4 w-4" />
          {guardando ? "Guardando…" : "Guardar configuración"}
        </button>
      </div>

      <div className="grid gap-3">
        <h3 className="text-sm font-bold uppercase tracking-wide text-primary">
          Tiendas que el chatbot puede conocer
        </h3>

        <label className="flex items-center gap-2 rounded-xl border border-border bg-background p-3 text-sm font-semibold">
          <input
            type="checkbox"
            checked={todas}
            onChange={(e) => setTodas(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-brand"
          />
          Todas las tiendas (recomendado)
        </label>

        <div
          className={`max-h-80 overflow-y-auto rounded-xl border border-border p-2 ${
            todas ? "opacity-50" : ""
          }`}
        >
          {tiendas.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">Aún no hay tiendas registradas.</p>
          )}
          {tiendas.map((t) => (
            <label
              key={t.id}
              className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent"
            >
              <input
                type="checkbox"
                checked={todas || seleccionadas.includes(t.id)}
                disabled={todas}
                onChange={() => alternarTienda(t.id)}
                className="rounded border-border accent-brand"
              />
              <span className="truncate">{t.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">{t.location ?? ""}</span>
            </label>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          El chatbot solo responderá con productos de las tiendas seleccionadas. Si está en “Todas
          las tiendas”, conocerá el catálogo completo y se actualizará automáticamente.
        </p>
      </div>
    </div>
  );
}
