import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Save, Trash2, Type } from "lucide-react";
import {
  APARIENCIA_BASE,
  FUENTES,
  aplicarApariencia,
  fetchApariencia,
  guardarApariencia,
  type Apariencia,
} from "@/lib/apariencia";

/** Panel /admin → Apariencia: tipografía global y reemplazos de texto en toda la web. */
export function PanelApariencia() {
  const [a, setA] = useState<Apariencia | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    fetchApariencia()
      .then(setA)
      .catch(() => setA(APARIENCIA_BASE));
  }, []);

  if (!a) return <p className="p-8 text-center text-sm text-muted-foreground">Cargando…</p>;

  // Vista previa inmediata en esta pestaña; al guardar se aplica a todos en vivo.
  const cambiar = (parcial: Partial<Apariencia>) => {
    const nueva = { ...a, ...parcial };
    setA(nueva);
    aplicarApariencia(nueva);
  };
  const regla = (i: number, campo: "de" | "a", valor: string) =>
    cambiar({ replacements: a.replacements.map((r, j) => (j === i ? { ...r, [campo]: valor } : r)) });

  const guardar = async () => {
    setGuardando(true);
    try {
      await guardarApariencia({ ...a, replacements: a.replacements.filter((r) => r.de.trim()) });
      toast.success("Apariencia guardada. Ya se ve así en la web y la app.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="grid gap-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <Type className="h-5 w-5 text-brand" /> Apariencia y textos
        </h2>
        <div className="flex gap-2">
          <button type="button" className="btn-base btn-outline" onClick={() => cambiar(APARIENCIA_BASE)}>
            Restablecer
          </button>
          <button type="button" className="btn-base btn-brand" onClick={guardar} disabled={guardando}>
            <Save className="h-4 w-4" /> {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Campo label="Tipo de letra">
          <select className="select-uniko" value={a.font_family} onChange={(e) => cambiar({ font_family: e.target.value })}>
            {FUENTES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label={`Tamaño del texto: ${a.base_size}px`}>
          <input
            type="range"
            min={12}
            max={22}
            value={a.base_size}
            onChange={(e) => cambiar({ base_size: Number(e.target.value) })}
            className="accent-brand"
          />
        </Campo>
        <Campo label="Grosor del texto">
          <select className="select-uniko" value={a.body_weight} onChange={(e) => cambiar({ body_weight: Number(e.target.value) })}>
            <option value={300}>Fino</option>
            <option value={400}>Normal</option>
            <option value={500}>Medio</option>
            <option value={600}>Seminegrita</option>
          </select>
        </Campo>
        <Campo label="Grosor de los títulos">
          <select className="select-uniko" value={a.heading_weight} onChange={(e) => cambiar({ heading_weight: Number(e.target.value) })}>
            <option value={400}>Normal</option>
            <option value={500}>Medio</option>
            <option value={600}>Seminegrita</option>
            <option value={700}>Negrita</option>
            <option value={800}>Extra negrita</option>
            <option value={900}>Máxima</option>
          </select>
        </Campo>
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={a.headings_uppercase}
            onChange={(e) => cambiar({ headings_uppercase: e.target.checked })}
            className="accent-brand"
          />
          Títulos en MAYÚSCULAS
        </label>
      </section>

      <section className="grid gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-primary">Cambiar textos</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Escribe el texto tal como aparece en la web (respeta mayúsculas) y por cuál cambiarlo. Se aplica
            en todas las páginas, la app y la APK. Al borrar una regla, el texto original vuelve tras recargar.
          </p>
        </div>
        {a.replacements.map((r, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input className="input-uniko" placeholder="Texto original" value={r.de} onChange={(e) => regla(i, "de", e.target.value)} />
            <input className="input-uniko" placeholder="Texto nuevo" value={r.a} onChange={(e) => regla(i, "a", e.target.value)} />
            <button
              type="button"
              aria-label="Quitar regla"
              className="btn-base btn-outline"
              onClick={() => cambiar({ replacements: a.replacements.filter((_, j) => j !== i) })}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn-base btn-outline w-fit"
          onClick={() => cambiar({ replacements: [...a.replacements, { de: "", a: "" }] })}
        >
          <Plus className="h-4 w-4" /> Añadir texto a cambiar
        </button>
      </section>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-bold uppercase tracking-wide text-primary">{label}</span>
      {children}
    </label>
  );
}
