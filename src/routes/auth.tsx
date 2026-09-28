import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { LogIn, Store, Upload, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { fetchCategorias, slugUnico, subirImagen } from "@/lib/queries";
import { provincias } from "@/data/marketplace";
import type { Categoria } from "@/data/marketplace";

export const Route = createFileRoute("/auth")({
  validateSearch: (search): { redirect?: string; modo?: "entrar" | "crear" } => {
    const s = search as Record<string, unknown>;
    const out: { redirect?: string; modo?: "entrar" | "crear" } = {};
    const redirect = s["redirect"];
    if (typeof redirect === "string" && redirect.startsWith("/") && !redirect.startsWith("//")) {
      out.redirect = redirect;
    }
    const modo = s["modo"];
    if (modo === "crear" || modo === "entrar") out.modo = modo;
    return out;
  },
  loader: async () => ({ categorias: await fetchCategorias() }),
  head: () => ({
    meta: [{ title: "Entrar o crear cuenta · UNIKO-RD" }, { name: "robots", content: "noindex" }],
  }),
  component: Auth,
});

function mensajeError(msg: string): string {
  if (msg.toLowerCase().includes("invalid login")) return "Credenciales incorrectas.";
  if (msg.toLowerCase().includes("already registered")) return "Ese correo ya está registrado.";
  if (msg.toLowerCase().includes("password"))
    return "La contraseña no cumple los requisitos (mínimo 6 caracteres).";
  return msg;
}

function Auth() {
  const { redirect, modo } = Route.useSearch();
  const { categorias } = Route.useLoaderData();
  const router = useRouter();
  const { session, loading } = useAuth();
  const [tab, setTab] = useState<"entrar" | "crear">(modo ?? "entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [cedula, setCedula] = useState("");
  const [telefono, setTelefono] = useState("");
  const [tipoCuenta, setTipoCuenta] = useState<"comprador" | "vendedor">(
    redirect === "/vender" || redirect === "/publicar" ? "vendedor" : "comprador",
  );
  const [nombreTienda, setNombreTienda] = useState("");
  const [categoriaTienda, setCategoriaTienda] = useState("");
  const [ubicacionTienda, setUbicacionTienda] = useState("");
  const [descripcionTienda, setDescripcionTienda] = useState("");
  const [logoTienda, setLogoTienda] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);

  const destino = redirect ?? "/";
  const categoriasTienda = categorias.filter((c) => c.tipo !== "servicio");

  const irADestino = () => {
    router.history.push(destino);
  };

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enviando) return;
    setEnviando(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setEnviando(false);
    if (error) {
      toast.error(mensajeError(error.message));
      return;
    }
    toast.success("¡Bienvenido de vuelta!");
    irADestino();
  };

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enviando) return;
    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (!nombres.trim() || !apellidos.trim()) {
      toast.error("Indica tus nombres y apellidos.");
      return;
    }
    if (tipoCuenta === "vendedor") {
      if (nombreTienda.trim().length < 3) {
        toast.error("Escribe el nombre de tu tienda.");
        return;
      }
      if (!categoriaTienda) {
        toast.error("Elige la categoría de tu tienda.");
        return;
      }
      if (!ubicacionTienda) {
        toast.error("Elige la ubicación de tu tienda.");
        return;
      }
      if (logoTienda && !["image/png", "image/jpeg"].includes(logoTienda.type)) {
        toast.error("El logo debe ser una imagen PNG o JPG.");
        return;
      }
    }
    setEnviando(true);
    const nombreCompleto = `${nombres.trim()} ${apellidos.trim()}`.trim();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: nombreCompleto,
          first_name: nombres.trim(),
          last_name: apellidos.trim(),
          cedula: cedula.trim(),
          phone: telefono.trim(),
          account_type: tipoCuenta === "vendedor" ? "vendor" : "user",
        },
      },
    });
    setEnviando(false);
    if (error) {
      toast.error(mensajeError(error.message));
      return;
    }
    if (!data.session) {
      toast.info("Revisa tu correo para confirmar tu cuenta y luego crea tu tienda en /vender.");
      router.history.push("/vender");
      return;
    }
    if (tipoCuenta !== "vendedor") {
      toast.success("Cuenta creada. ¡Bienvenido!");
      irADestino();
      return;
    }
    await crearTienda(data.session.user.id);
  };

  const crearTienda = async (userId: string) => {
    setEnviando(true);
    try {
      const cat = categoriasTienda.find((c) => c.slug === categoriaTienda);
      let logoUrl: string | null = null;
      if (logoTienda) logoUrl = await subirImagen(logoTienda, userId);

      const { error } = await supabase.from("stores").insert({
        id: slugUnico(nombreTienda),
        owner_id: userId,
        owner_name: `${nombres.trim()} ${apellidos.trim()}`.trim(),
        name: nombreTienda.trim(),
        description: descripcionTienda.trim() || null,
        category: cat?.nombre ?? null,
        location: ubicacionTienda || null,
        logo: logoUrl,
      });
      if (error) throw new Error(error.message);

      toast.success("¡Cuenta y tienda creadas!");
      router.history.push("/publicar");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? `La cuenta se creó, pero no la tienda: ${err.message}`
          : "La cuenta se creó, pero no la tienda.",
      );
      router.history.push("/vender");
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </div>
    );
  }

  if (session) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="card-uniko p-8">
          <h1 className="text-xl font-bold">Ya tienes sesión activa</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Puedes seguir explorando o ir a tu cuenta.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button type="button" onClick={irADestino} className="btn-base btn-brand">
              Continuar
            </button>
            <button
              type="button"
              onClick={() => router.history.push("/cuenta")}
              className="btn-base btn-outline"
            >
              Mi cuenta
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="card-uniko p-6 sm:p-8">
        <h1 className="text-2xl font-bold">
          {tab === "entrar" ? "Inicia sesión" : "Crea tu cuenta"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {tab === "entrar"
            ? "Entra para comprar, vender y guardar tus favoritos."
            : "Únete a UNIKO-RD en un minuto. Sin costo."}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-1 rounded-full border border-border bg-background p-1">
          <button
            type="button"
            onClick={() => setTab("entrar")}
            className={`rounded-full px-3 py-2 text-sm font-semibold ${
              tab === "entrar" ? "bg-primary text-primary-foreground" : "text-foreground"
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setTab("crear")}
            className={`rounded-full px-3 py-2 text-sm font-semibold ${
              tab === "crear" ? "bg-primary text-primary-foreground" : "text-foreground"
            }`}
          >
            Crear cuenta
          </button>
        </div>

        {tab === "entrar" ? (
          <form onSubmit={entrar} className="mt-6 grid gap-4">
            <Campo label="Correo electrónico">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                className="input-uniko"
                autoComplete="email"
              />
            </Campo>
            <Campo label="Contraseña">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-uniko"
                autoComplete="current-password"
              />
            </Campo>
            <button type="submit" disabled={enviando} className="btn-base btn-brand">
              <LogIn className="h-4 w-4" />
              {enviando ? "Entrando…" : "Entrar"}
            </button>
          </form>
        ) : (
          <form onSubmit={crear} className="mt-6 grid gap-4">
            <fieldset className="grid gap-1.5">
              <legend className="mb-1.5 text-xs font-bold uppercase tracking-wide text-primary">
                Tipo de cuenta
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { valor: "comprador", titulo: "Usuario", desc: "Compra y califica tiendas" },
                    { valor: "vendedor", titulo: "Tienda", desc: "Crea tu tienda y vende" },
                  ] as const
                ).map((op) => (
                  <button
                    key={op.valor}
                    type="button"
                    aria-pressed={tipoCuenta === op.valor}
                    onClick={() => setTipoCuenta(op.valor)}
                    className={`rounded-xl border px-3 py-2 text-left transition ${
                      tipoCuenta === op.valor
                        ? "border-brand bg-brand/10"
                        : "border-border bg-background hover:border-brand/50"
                    }`}
                  >
                    <span className="block text-sm font-bold">{op.titulo}</span>
                    <span className="block text-[11px] text-muted-foreground">{op.desc}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="Nombres">
                <input
                  type="text"
                  required
                  value={nombres}
                  onChange={(e) => setNombres(e.target.value)}
                  placeholder="Tus nombres"
                  className="input-uniko"
                  autoComplete="given-name"
                />
              </Campo>
              <Campo label="Apellidos">
                <input
                  type="text"
                  required
                  value={apellidos}
                  onChange={(e) => setApellidos(e.target.value)}
                  placeholder="Tus apellidos"
                  className="input-uniko"
                  autoComplete="family-name"
                />
              </Campo>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="Cédula">
                <input
                  type="text"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  placeholder="000-0000000-0"
                  className="input-uniko"
                  inputMode="numeric"
                />
              </Campo>
              <Campo label="Teléfono">
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="809-000-0000"
                  className="input-uniko"
                  autoComplete="tel"
                />
              </Campo>
            </div>

            {tipoCuenta === "vendedor" && (
              <div className="grid gap-4 rounded-2xl border border-brand/30 bg-brand/5 p-4">
                <div className="grid gap-1">
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary">
                    <Store className="h-4 w-4" /> Datos de tu tienda
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Propietario:{" "}
                    <span className="font-semibold text-foreground">
                      {[nombres.trim(), apellidos.trim()].filter(Boolean).join(" ") || "tú"}
                    </span>{" "}
                    (tu nombre y apellido, visible en el perfil público).
                  </p>
                </div>

                <Campo label="Nombre de la tienda">
                  <input
                    type="text"
                    required
                    value={nombreTienda}
                    onChange={(e) => setNombreTienda(e.target.value)}
                    placeholder="Ej: Tech Store RD"
                    className="input-uniko"
                    maxLength={80}
                  />
                </Campo>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Campo label="Categoría">
                    <select
                      required
                      value={categoriaTienda}
                      onChange={(e) => setCategoriaTienda(e.target.value)}
                      className="select-uniko"
                    >
                      <option value="">Selecciona…</option>
                      {categoriasTienda.map((c: Categoria) => (
                        <option key={c.slug} value={c.slug}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  </Campo>
                  <Campo label="Ubicación">
                    <select
                      required
                      value={ubicacionTienda}
                      onChange={(e) => setUbicacionTienda(e.target.value)}
                      className="select-uniko"
                    >
                      <option value="">Selecciona…</option>
                      {provincias.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </Campo>
                </div>

                <Campo label="Descripción de la tienda">
                  <textarea
                    value={descripcionTienda}
                    onChange={(e) => setDescripcionTienda(e.target.value)}
                    placeholder="Qué vende tu tienda, desde cuándo opera y qué la hace especial…"
                    className="input-uniko min-h-20 resize-y"
                    maxLength={600}
                  />
                </Campo>

                <Campo label="Logo (opcional) · solo PNG o JPG">
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background px-3 py-3 text-xs font-semibold text-muted-foreground hover:border-brand hover:text-brand">
                    <Upload className="h-4 w-4" />
                    {logoTienda ? logoTienda.name : "Subir logo"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      className="hidden"
                      onChange={(e) => {
                        const archivo = e.target.files?.[0] ?? null;
                        if (archivo && !["image/png", "image/jpeg"].includes(archivo.type)) {
                          toast.error("El logo debe ser una imagen PNG o JPG.");
                          e.target.value = "";
                          setLogoTienda(null);
                          return;
                        }
                        setLogoTienda(archivo);
                      }}
                    />
                  </label>
                </Campo>
              </div>
            )}

            <Campo label="Correo electrónico">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                className="input-uniko"
                autoComplete="email"
              />
            </Campo>
            <Campo label="Contraseña">
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="input-uniko"
                autoComplete="new-password"
              />
            </Campo>
            <button type="submit" disabled={enviando} className="btn-base btn-brand">
              <UserPlus className="h-4 w-4" />
              {enviando
                ? "Creando…"
                : tipoCuenta === "vendedor"
                  ? "Crear cuenta y tienda"
                  : "Crear cuenta"}
            </button>
          </form>
        )}

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Al continuar aceptas los términos y condiciones de UNIKO-RD.
        </p>
      </div>
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
