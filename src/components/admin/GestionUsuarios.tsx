import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchPerfilesAdmin } from "@/lib/queries";
import { api, CLOUDFLARE_API } from "@/lib/cloudflare";
import type { ProfileRow } from "@/lib/types";

const ROLES = [
  { valor: "user", etiqueta: "Usuario" },
  { valor: "vendor", etiqueta: "Vendedor" },
  { valor: "admin", etiqueta: "Admin" },
];

export function GestionUsuarios() {
  const [perfiles, setPerfiles] = useState<ProfileRow[] | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [guardandoId, setGuardandoId] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    fetchPerfilesAdmin()
      .then((p) => {
        if (activo) setPerfiles(p);
      })
      .catch((err: unknown) => {
        toast.error(err instanceof Error ? err.message : "No pudimos cargar los usuarios.");
        if (activo) setPerfiles([]);
      });
    return () => {
      activo = false;
    };
  }, []);

  const filtrados = useMemo(() => {
    if (!perfiles) return [];
    const q = busqueda.trim().toLowerCase();
    if (!q) return perfiles;
    return perfiles.filter((p) =>
      [p.email, p.full_name, p.first_name, p.last_name, p.cedula, p.phone]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [perfiles, busqueda]);

  const cambiarRol = async (id: string, rol: string) => {
    setGuardandoId(id);
    let error: Error | null = null;
    try {
      if (CLOUDFLARE_API) await api(`/api/admin/profiles/${id}`, { method: "PATCH", body: JSON.stringify({ role: rol }) });
      else { const result = await supabase.from("profiles").update({ role: rol }).eq("id", id); if (result.error) error = new Error(result.error.message); }
    } catch (err) { error = err instanceof Error ? err : new Error("No se pudo guardar."); }
    setGuardandoId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPerfiles((prev) => (prev ? prev.map((p) => (p.id === id ? { ...p, role: rol } : p)) : prev));
    toast.success("Rol actualizado.");
  };

  if (!perfiles) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Cargando usuarios…</div>;
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 font-semibold">
          <Users className="h-5 w-5 text-brand" /> Usuarios ({perfiles.length})
        </h2>
        <label className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, correo, cédula…"
            className="input-uniko pl-9"
          />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-3">Usuario</th>
              <th className="py-2 pr-3">Correo</th>
              <th className="py-2 pr-3">Cédula</th>
              <th className="py-2 pr-3">Teléfono</th>
              <th className="py-2 pr-3">Rol</th>
              <th className="py-2">Creado</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                  Sin resultados para “{busqueda}”.
                </td>
              </tr>
            )}
            {filtrados.map((p) => (
              <tr key={p.id} className="border-b border-border/60 align-top">
                <td className="py-2.5 pr-3 font-semibold">{p.full_name ?? "—"}</td>
                <td className="py-2.5 pr-3 text-muted-foreground">{p.email ?? "—"}</td>
                <td className="py-2.5 pr-3 text-muted-foreground">{p.cedula ?? "—"}</td>
                <td className="py-2.5 pr-3 text-muted-foreground">{p.phone ?? "—"}</td>
                <td className="py-2.5 pr-3">
                  <select
                    value={p.role}
                    disabled={guardandoId === p.id}
                    onChange={(e) => cambiarRol(p.id, e.target.value)}
                    className="select-uniko w-32"
                  >
                    {ROLES.map((r) => (
                      <option key={r.valor} value={r.valor}>
                        {r.etiqueta}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2.5 text-xs text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString("es-DO")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
