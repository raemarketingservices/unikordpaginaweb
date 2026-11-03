import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogIn, Store, Upload, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { LOCAL_CATALOG } from "@/lib/local-catalog";
import { createLocalStore, localFileUrl, registerLocalUser, signInLocal } from "@/lib/local-db";
import { api, CLOUDFLARE_API, cloudLogin, cloudRegister, cloudUpload } from "@/lib/cloudflare";
import { useAuth } from "@/lib/auth";
import { fetchCategorias, slugUnico, subirImagen } from "@/lib/queries";
import { Checkbox } from "@/components/ui/checkbox";
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
    return "La contraseña no cumple los requisitos (mínimo 8 caracteres).";
  return msg;
}

/**
 * El alta con Google sale de la página: el navegador salta a accounts.google.com y
 * vuelve con el token en la URL, así que el formulario ya no existe. El borrador se
 * guarda en sessionStorage (misma pestaña, se va al cerrar) y la tienda se crea al
 * regresar, cuando ya hay sesión y el RLS deja insertarla.
 */
const CLAVE_BORRADOR = "uniko.borrador.tienda";

type Borrador = {
  nombres: string;
  apellidos: string;
  cedula: string;
  telefono: string;
  nombreTienda: string;
  categoriaSlug: string;
  ubicacion: string;
  descripcion: string;
  aceptaMarketing: boolean;
  /** data URL del logo; sessionStorage no admite File. */
  logo?: { nombre: string; tipo: string; data: string };
};

function leerBorrador(): Borrador | null {
  try {
    const crudo = sessionStorage.getItem(CLAVE_BORRADOR);
    return crudo ? (JSON.parse(crudo) as Borrador) : null;
  } catch {
    return null;
  }
}

function guardarBorrador(b: Borrador): void {
  sessionStorage.setItem(CLAVE_BORRADOR, JSON.stringify(b));
}

function borrarBorrador(): void {
  sessionStorage.removeItem(CLAVE_BORRADOR);
}

function aFile(logo: NonNullable<Borrador["logo"]>): File {
  const bin = atob(logo.data.slice(logo.data.indexOf(",") + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], logo.nombre, { type: logo.tipo });
}

function aDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("No se pudo leer el logo."));
    fr.readAsDataURL(file);
  });
}

function Auth() {
  const { redirect, modo } = Route.useSearch();
  const { categorias } = Route.useLoaderData();
  const router = useRouter();
  const { session, loading, refreshLocal } = useAuth();
  const [tab, setTab] = useState<"entrar" | "crear">(modo ?? "entrar");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState('');
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
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [aceptaMarketing, setAceptaMarketing] = useState(false);
  const [enviando, setEnviando] = useState(false);
  // GoTrue no publica qué proveedores están encendidos de forma legible desde el
  // navegador, así que la imagen se construye con el flag del lado que sí está listo.
  const googleListo =
    !LOCAL_CATALOG && !CLOUDFLARE_API && import.meta.env["VITE_GOOGLE_OAUTH"] === "true";

  const destino = redirect ?? "/";
  const categoriasTienda = categorias.filter((c) => c.tipo !== "servicio");

  const irADestino = () => {
    router.history.push(destino);
  };

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enviando) return;
    setEnviando(true);
    if (LOCAL_CATALOG) {
      try {
        await signInLocal(email, password);
        refreshLocal();
        toast.success("¡Bienvenido de vuelta!");
        irADestino();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
      } finally { setEnviando(false); }
      return;
    }
    if (CLOUDFLARE_API) {
      try {
        await cloudLogin(email, password);
        refreshLocal();
        toast.success("¡Bienvenido de vuelta!");
        irADestino();
      } catch (err) { toast.error(err instanceof Error ? err.message : "No se pudo iniciar sesión."); }
      finally { setEnviando(false); }
      return;
    }
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
    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (!nombres.trim() || !apellidos.trim()) {
      toast.error("Indica tus nombres y apellidos.");
      return;
    }
    if (!aceptaTerminos) {
      toast.error("Debes aceptar los Términos y la Política de Privacidad para crear tu cuenta.");
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
    if (LOCAL_CATALOG) {
      try {
        const user = await registerLocalUser({ email, password, firstName: nombres, lastName: apellidos,
          cedula, phone: telefono, role: tipoCuenta === "vendedor" ? "vendor" : "user" });
        if (tipoCuenta === "vendedor") {
          const logo = logoTienda ? await localFileUrl(logoTienda) : "";
          createLocalStore({ id: slugUnico(nombreTienda), nombre: nombreTienda.trim(),
            categoria: categoriasTienda.find((c) => c.slug === categoriaTienda)?.nombre ?? "",
            ubicacion: ubicacionTienda, descripcion: descripcionTienda.trim(),
            propietario: nombreCompleto, verificado: false, rating: 0, resenas: 0,
            seguidores: 0, productos: 0, logo, portada: logo }, user.id);
        }
        refreshLocal();
        await router.invalidate();
        toast.success(tipoCuenta === "vendedor" ? "¡Cuenta y tienda creadas!" : "¡Cuenta creada!");
        router.history.push(tipoCuenta === "vendedor" ? "/publicar" : destino);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "No se pudo crear la cuenta.");
      } finally { setEnviando(false); }
      return;
    }
    if (CLOUDFLARE_API) {
      try {
        const user = await cloudRegister({ email, password, username, first_name: nombres, last_name: apellidos,
          cedula, phone: telefono, role: tipoCuenta === "vendedor" ? "vendor" : "user" });
        if (tipoCuenta === "vendedor") {
          const logo = logoTienda ? await cloudUpload(logoTienda) : "";
          await api("/api/stores", { method: "POST", body: JSON.stringify({
            name: nombreTienda, category: categoriasTienda.find((c) => c.slug === categoriaTienda)?.nombre,
            location: ubicacionTienda, description: descripcionTienda, logo,
          }) });
        }
        refreshLocal();
        await router.invalidate();
        toast.success(tipoCuenta === "vendedor" ? "¡Cuenta y tienda creadas!" : "¡Cuenta creada!");
        router.history.push(tipoCuenta === "vendedor" ? "/publicar" : destino);
      } catch (err) { toast.error(err instanceof Error ? err.message : "No se pudo crear la cuenta."); }
      finally { setEnviando(false); }
      return;
    }
    const ahora = new Date().toISOString();
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
          terms_accepted_at: ahora,
          privacy_accepted_at: ahora,
          marketing_accepted_at: aceptaMarketing ? ahora : null,
          consent_version: "2026-09",
        },
      },
    });
    setEnviando(false);
    if (error) {
      toast.error(mensajeError(error.message));
      return;
    }
    // Con vendedor se guarda el borrador aunque haya sesión inmediata: si la tienda
    // no se crea (corte, error de Storage), al volver a /auth se retoma sola.
    const borrador = tipoCuenta === "vendedor" ? await construirBorrador() : null;
    if (borrador) guardarBorrador(borrador);

    if (!data.session) {
      toast.info(
        borrador
          ? "Revisa tu correo para confirmar la cuenta. Al volver, tu tienda quedará registrada en revisión."
          : "Revisa tu correo para confirmar tu cuenta.",
      );
      router.history.push(borrador ? "/auth?modo=entrar" : "/vender");
      return;
    }
    if (!borrador) {
      toast.success("Cuenta creada. ¡Bienvenido!");
      irADestino();
      return;
    }
    await crearTienda(data.session.user.id, borrador);
  };

  const crearTienda = async (userId: string, d: Borrador) => {
    setEnviando(true);
    try {
      const cat = categoriasTienda.find((c) => c.slug === d.categoriaSlug);
      let logoUrl: string | null = null;
      if (d.logo) logoUrl = await subirImagen(aFile(d.logo), userId);

      // Google solo entrega nombre y correo: los datos que el vendedor escribió en el
      // formulario (cédula, teléfono, rol y consentimientos) se escriben aquí.
      const ahora = new Date().toISOString();
      const perfil = await supabase
        .from("profiles")
        .update({
          full_name: `${d.nombres} ${d.apellidos}`.trim(),
          first_name: d.nombres,
          last_name: d.apellidos,
          phone: d.telefono || null,
          cedula: d.cedula || null,
          role: "vendor",
          terms_accepted_at: ahora,
          privacy_accepted_at: ahora,
          marketing_accepted_at: d.aceptaMarketing ? ahora : null,
          consent_version: "2026-09",
        })
        .eq("id", userId);
      if (perfil.error) throw new Error(perfil.error.message);

      const { error } = await supabase.from("stores").insert({
        id: slugUnico(d.nombreTienda),
        owner_id: userId,
        owner_name: `${d.nombres} ${d.apellidos}`.trim(),
        name: d.nombreTienda.trim(),
        description: d.descripcion.trim() || null,
        category: cat?.nombre ?? null,
        location: d.ubicacion || null,
        logo: logoUrl,
        // Sin esto la tienda nacería aprobada por defecto si alguien cambia la
        // columna más adelante; el alta pública siempre entra por la cola.
        approved: false,
      });
      if (error) throw new Error(error.message);

      borrarBorrador();
      toast.success("Tu tienda quedó registrada y está en revisión.");
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

  // Volvió de Google con sesión y un borrador en el bolsillo: aquí se crea la tienda.
  useEffect(() => {
    if (!session || LOCAL_CATALOG || CLOUDFLARE_API) return;
    const borrador = leerBorrador();
    if (!borrador) return;
    void crearTienda(session.user.id, borrador);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const construirBorrador = async (): Promise<Borrador> => {
    const borrador: Borrador = {
      nombres: nombres.trim(),
      apellidos: apellidos.trim(),
      cedula: cedula.trim(),
      telefono: telefono.trim(),
      nombreTienda: nombreTienda.trim(),
      categoriaSlug: categoriaTienda,
      ubicacion: ubicacionTienda,
      descripcion: descripcionTienda.trim(),
      aceptaMarketing,
    };
    if (logoTienda) {
      // sessionStorage lleva ~5 MB; un logo de pantalla completa ya desborda y el
      // alta se perdería en silencio, así que se guarda sin logo y se sube después.
      if (logoTienda.size > 1_500_000) {
        toast.error("El logo pesa demasiado para guardarlo durante el registro; súbelo después en Ajustes.");
      } else {
        borrador.logo = { nombre: logoTienda.name, tipo: logoTienda.type, data: await aDataURL(logoTienda) };
      }
    }
    return borrador;
  };

  const conGoogle = async () => {
    if (enviando) return;
    if (tab === "crear" && tipoCuenta === "vendedor") {
      const problema =
        nombreTienda.trim().length < 3
          ? "Escribe el nombre de tu tienda."
          : !categoriaTienda
            ? "Elige la categoría de tu tienda."
            : !ubicacionTienda
              ? "Elige la ubicación de tu tienda."
              : !nombres.trim() || !apellidos.trim()
                ? "Indica tus nombres y apellidos antes de continuar con Google."
                : null;
      if (problema) {
        toast.error(problema);
        return;
      }
    }
    setEnviando(true);
    try {
      if (tab === "crear" && tipoCuenta === "vendedor") guardarBorrador(await construirBorrador());
      else borrarBorrador();

      // Se vuelve a /auth aunque exista un destino: el efecto que consume el borrador
      // vive en esta página y desde aquí se navega al destino con la tienda creada.
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth${
            redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""
          }`,
        },
      });
      if (error) {
        borrarBorrador();
        toast.error(error.message);
        return;
      }
      // El navegador se va a Google; no hay que limpiar nada ni navegar.
    } catch (err) {
      borrarBorrador();
      toast.error(err instanceof Error ? err.message : "No se pudo iniciar el acceso con Google.");
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
      <Link to="/" className="mb-6 inline-block text-sm font-semibold text-primary">← Volver al inicio</Link>
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

        {googleListo && (
          <>
            <div className="mt-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                o
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <button
              type="button"
              onClick={conGoogle}
              disabled={enviando}
              className="btn-base btn-outline mt-5 w-full justify-center gap-2"
            >
              <GoogleMark />
              {tab === "entrar"
                ? "Continuar con Google"
                : tipoCuenta === "vendedor"
                  ? "Registrarse con Google"
                  : "Continuar con Google"}
            </button>
            {tab === "crear" && tipoCuenta === "vendedor" && (
              <p className="text-xs text-muted-foreground">
                Tu tienda queda <strong>en revisión</strong>; UNIKO-RD la aprueba antes de
                mostrarla en el marketplace.
              </p>
            )}
          </>
        )}

        {tab === "entrar" ? (
          <form onSubmit={entrar} className="mt-6 grid gap-4">
            <Campo label="Nombre de usuario o correo">
              <input
                type="text"
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
            <Campo label="Nombre de usuario"><input required minLength={3} maxLength={30} pattern="[a-zA-Z0-9_]{3,30}" autoComplete="username" autoCapitalize="none" spellCheck={false} className="input-uniko text-base" value={username} onChange={e => setUsername(e.target.value)} placeholder="Ej: maria_rd" /><span className="text-xs text-muted-foreground">Letras, números o guion bajo. Lo usarás para entrar a la app.</span></Campo>
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
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="input-uniko"
                autoComplete="new-password"
              />
            </Campo>

            <div className="grid gap-3 rounded-2xl border border-border bg-background p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <Checkbox
                  checked={aceptaTerminos}
                  onCheckedChange={(v) => setAceptaTerminos(v === true)}
                  className="mt-0.5 shrink-0"
                />
                <span className="text-xs leading-relaxed text-muted-foreground">
                  He leído y acepto los{" "}
                  <Link
                    to="/legal/$doc"
                    params={{ doc: "terminos" }}
                    target="_blank"
                    className="font-semibold text-brand underline"
                  >
                    Términos y Condiciones
                  </Link>{" "}
                  y la{" "}
                  <Link
                    to="/legal/$doc"
                    params={{ doc: "privacidad" }}
                    target="_blank"
                    className="font-semibold text-brand underline"
                  >
                    Política de Privacidad y Protección de Datos Personales
                  </Link>{" "}
                  (Ley 158-13), y consiento el tratamiento de mis datos para crear y gestionar mi
                  cuenta.
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3">
                <Checkbox
                  checked={aceptaMarketing}
                  onCheckedChange={(v) => setAceptaMarketing(v === true)}
                  className="mt-0.5 shrink-0"
                />
                <span className="text-xs leading-relaxed text-muted-foreground">
                  Acepto recibir ofertas, novedades y promociones de UNIKO-RD por correo.{" "}
                  <span className="font-semibold">Opcional</span>: puedes revocarlo cuando quieras
                  escribiéndonos.
                </span>
              </label>
            </div>

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
          {tab === "entrar" ? (
            <>
              Al entrar aceptas los{" "}
              <Link
                to="/legal/$doc"
                params={{ doc: "terminos" }}
                target="_blank"
                className="font-semibold text-brand underline"
              >
                Términos
              </Link>{" "}
              y la{" "}
              <Link
                to="/legal/$doc"
                params={{ doc: "privacidad" }}
                target="_blank"
                className="font-semibold text-brand underline"
              >
                Política de Privacidad
              </Link>
              .
            </>
          ) : (
            <>
              Tus datos se tratan conforme a nuestra{" "}
              <Link
                to="/legal/$doc"
                params={{ doc: "privacidad" }}
                target="_blank"
                className="font-semibold text-brand underline"
              >
                Política de Privacidad
              </Link>
              .
            </>
          )}
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

/** La G de Google: lucide no trae marcas registradas. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.8-2.1 5.1-4.4 6.7v5.6h7.1c4.2-3.8 6.6-9.5 6.6-16.3z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.5 0 11.9-2.1 15.9-5.7l-7.1-5.6c-2 1.3-4.5 2.1-8.8 2.1-6.8 0-12.5-4.6-14.6-10.7H2.2v5.8C6.2 42.7 14.6 48 24 48z"
      />
      <path
        fill="#FBBC05"
        d="M9.4 28.1c-.5-1.5-.8-3.1-.8-4.6s.3-3.1.8-4.6V13.1H2.2C.6 16.5 0 20.1 0 23.5s.6 7 2.2 10.4l7.2-5.8z"
      />
      <path
        fill="#EA4335"
        d="M24 9.6c3.6 0 6.8 1.2 9.3 3.6l7-7C35.9 2.5 30.5 0 24 0 14.6 0 6.2 5.3 2.2 13.1l7.2 5.8C11.5 13.4 17.2 9.6 24 9.6z"
      />
    </svg>
  );
}
