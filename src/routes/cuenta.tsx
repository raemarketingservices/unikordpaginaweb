import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogOut, Key, Settings, Mail, Shield, Camera, Save, User } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { subirImagen } from "@/lib/queries";

export const Route = createFileRoute("/cuenta")({
  head: () => ({
    meta: [{ title: "Mi cuenta · UNIKO-RD" }, { name: "robots", content: "noindex" }],
  }),
  component: Cuenta,
});

function Cuenta() {
  const { session, profile, loading, isAdmin, salir, refrescarPerfil } = useAuth();
  const [cambiandoPw, setCambiandoPw] = useState(false);
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");

  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [cedula, setCedula] = useState("");
  const [telefono, setTelefono] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setNombres(profile.first_name ?? "");
    setApellidos(profile.last_name ?? "");
    setCedula(profile.cedula ?? "");
    setTelefono(profile.phone ?? "");
    setAvatarPreview(profile.avatar_url ?? null);
  }, [profile]);

  const cambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw1 !== pw2) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }
    if (pw1.length < 8) {
      toast.error("Mínimo 8 caracteres.");
      return;
    }
    setCambiandoPw(true);
    const { error } = await supabase.auth.updateUser({ password: pw1 });
    setCambiandoPw(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Contraseña actualizada.");
      setPw1("");
      setPw2("");
    }
  };

  const guardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardando || !session) return;
    if (!nombres.trim() || !apellidos.trim()) {
      toast.error("Indica tus nombres y apellidos.");
      return;
    }
    setGuardando(true);
    try {
      let avatarUrl = profile?.avatar_url ?? null;
      if (avatar) avatarUrl = await subirImagen(avatar, session.user.id);

      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: nombres.trim(),
          last_name: apellidos.trim(),
          full_name: `${nombres.trim()} ${apellidos.trim()}`,
          cedula: cedula.trim() || null,
          phone: telefono.trim() || null,
          avatar_url: avatarUrl,
        })
        .eq("id", session.user.id);
      if (error) throw new Error(error.message);

      await supabase
        .from("stores")
        .update({ owner_name: `${nombres.trim()} ${apellidos.trim()}` })
        .eq("owner_id", session.user.id);

      await refrescarPerfil();
      setAvatar(null);
      toast.success("Perfil actualizado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No pudimos guardar tu perfil.");
    } finally {
      setGuardando(false);
    }
  };

  if (loading)
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p>Cargando…</p>
      </div>
    );
  if (!session)
    return (
      <Link
        to="/auth"
        search={{ redirect: "/cuenta" }}
        className="btn-base btn-brand mx-auto block max-w-fit my-16"
      >
        Iniciar sesión
      </Link>
    );

  const iniciales = ((profile?.full_name || profile?.email || "U")[0] ?? "U").toUpperCase();

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="card-uniko p-6">
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 shrink-0">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Foto de perfil"
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-brand-foreground text-2xl font-bold">
                {iniciales}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold">{profile?.full_name ?? "Sin nombre"}</h1>
            <p className="truncate text-sm text-muted-foreground">{profile?.email}</p>
            {isAdmin && (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-xs font-bold text-brand">
                <Shield className="h-3 w-3" /> Admin
              </span>
            )}
          </div>
        </div>

        <form onSubmit={guardarPerfil} className="mt-6 grid gap-4 border-t border-border pt-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <User className="h-4 w-4" /> Mi perfil
          </h3>

          <label className="flex cursor-pointer items-center gap-3 text-xs font-semibold text-muted-foreground hover:text-brand">
            <span className="grid h-9 w-9 place-items-center rounded-full border border-dashed border-border">
              <Camera className="h-4 w-4" />
            </span>
            {avatar ? avatar.name : "Cambiar foto de perfil"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setAvatar(f);
                if (f) setAvatarPreview(URL.createObjectURL(f));
              }}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-primary">
                Nombres
              </span>
              <input
                type="text"
                required
                value={nombres}
                onChange={(e) => setNombres(e.target.value)}
                className="input-uniko"
                autoComplete="given-name"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-primary">
                Apellidos
              </span>
              <input
                type="text"
                required
                value={apellidos}
                onChange={(e) => setApellidos(e.target.value)}
                className="input-uniko"
                autoComplete="family-name"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-primary">Cédula</span>
              <input
                type="text"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                placeholder="000-0000000-0"
                className="input-uniko"
                inputMode="numeric"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-primary">
                Teléfono
              </span>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="809-000-0000"
                className="input-uniko"
                autoComplete="tel"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={guardando}
            className="btn-base btn-brand justify-self-start"
          >
            <Save className="h-4 w-4" />
            {guardando ? "Guardando…" : "Guardar perfil"}
          </button>
        </form>

        <div className="mt-6 grid gap-4">
          <div className="flex items-center justify-between border-t border-border pt-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-foreground">{profile?.email ?? "—"}</span>
            </div>
          </div>

          <form onSubmit={cambiarPassword} className="grid gap-3 border-t border-border pt-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Key className="h-4 w-4" /> Cambiar contraseña
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                type="password"
                value={pw1}
                onChange={(e) => setPw1(e.target.value)}
                placeholder="Nueva contraseña (mín 8)"
                className="input-uniko"
                autoComplete="new-password"
              />
              <input
                type="password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                placeholder="Confirmar"
                className="input-uniko"
                autoComplete="new-password"
              />
            </div>
            <button type="submit" disabled={cambiandoPw} className="btn-base btn-primary">
              Actualizar
            </button>
          </form>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <Link to="/vender" className="btn-base btn-outline">
          Mi tienda
        </Link>
        <Link to="/publicar" className="btn-base btn-brand">
          Publicar producto
        </Link>
      </div>

      {isAdmin && (
        <Link
          to="/admin"
          className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-brand hover:underline"
        >
          <Settings className="h-4 w-4" /> Panel de administración
        </Link>
      )}

      <button
        onClick={salir}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-destructive hover:bg-accent"
      >
        <LogOut className="h-4 w-4" /> Cerrar sesión
      </button>
    </div>
  );
}
