import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Store, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { LOCAL_CATALOG } from "@/lib/local-catalog";
import { createLocalStore, getLocalData, localFileUrl } from "@/lib/local-db";
import { api, CLOUDFLARE_API, cloudUpload } from "@/lib/cloudflare";
import { useAuth } from "@/lib/auth";
import { fetchCategorias, slugUnico, subirImagen } from "@/lib/queries";
import { Checkbox } from "@/components/ui/checkbox";
import { provincias } from "@/data/marketplace";
import type { Categoria } from "@/data/marketplace";
import type { StoreRow } from "@/lib/types";

export const Route = createFileRoute("/vender")({
  loader: async () => ({ categorias: await fetchCategorias() }),
  head: () => ({
    meta: [
      { title: "Vende en UNIKO-RD · Crea tu tienda" },
      {
        name: "description",
        content:
          "Abre tu tienda en UNIKO-RD y llega a clientes de toda República Dominicana. Publica productos en minutos.",
      },
    ],
  }),
  component: Vender,
});

function Vender() {
  const { categorias } = Route.useLoaderData();
  const router = useRouter();
  const { session, profile, loading } = useAuth();

  const [misTiendas, setMisTiendas] = useState<StoreRow[] | null>(null);
  const [cargandoTiendas, setCargandoTiendas] = useState(true);
  const [nombre, setNombre] = useState("");
  const [propietario, setPropietario] = useState("");
  const [rnc, setRnc] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [portada, setPortada] = useState<File | null>(null);
  const [faltaConsentimiento, setFaltaConsentimiento] = useState(false);
  const [aceptaNormas, setAceptaNormas] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const categoriasVender = categorias.filter((c) => c.tipo !== "servicio");

  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!userId) {
      setMisTiendas(null);
      setCargandoTiendas(false);
      return;
    }
    let activo = true;
    setCargandoTiendas(true);
    if (LOCAL_CATALOG) {
      const data = getLocalData();
      const owned = data.stores.filter((s) => data.storeOwners[s.id] === userId);
      setMisTiendas(owned.map((s) => ({ id: s.id, name: s.nombre } as StoreRow)));
      setCargandoTiendas(false);
      return;
    }
    if (CLOUDFLARE_API) {
      api<StoreRow[]>("/api/stores").then((all) => {
        if (!activo) return;
        setMisTiendas(all.filter((s) => s.owner_id === userId));
        setPropietario((v) => v || profile?.full_name || "");
        setCargandoTiendas(false);
      }).catch(() => { if (activo) setCargandoTiendas(false); });
      return () => { activo = false; };
    }
    Promise.all([
      supabase.from("stores").select("*").eq("owner_id", userId),
      supabase
        .from("profiles")
        .select("first_name,last_name,full_name,terms_accepted_at")
        .eq("id", userId)
        .maybeSingle(),
    ]).then(([tiendas, perfil]) => {
      if (!activo) return;
      setMisTiendas((tiendas.data as StoreRow[] | null) ?? []);
      const p = perfil.data as {
        first_name: string | null;
        last_name: string | null;
        full_name: string | null;
        terms_accepted_at?: string | null;
      } | null;
      if (p && !p.terms_accepted_at) setFaltaConsentimiento(true);
      const precargado =
        [p?.first_name, p?.last_name].filter(Boolean).join(" ").trim() ||
        (p?.full_name ?? "").trim();
      if (precargado) setPropietario((actual) => actual || precargado);
      setCargandoTiendas(false);
    });
    return () => {
      activo = false;
    };
  }, [userId, profile?.full_name]);

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enviando || !session) return;
    const cat = categoriasVender.find((c) => c.slug === categoria);

    const dueno = propietario.trim().replace(/\s+/g, " ");
    if (dueno.length < 3) {
      toast.error("Escribe el nombre y apellido del propietario de la tienda.");
      return;
    }
    if (!dueno.includes(" ")) {
      toast.error("Escribe nombre y apellido del propietario (ej: María Pérez).");
      return;
    }
    if (logo && !["image/png", "image/jpeg"].includes(logo.type)) {
      toast.error("El logo debe ser una imagen PNG o JPG.");
      return;
    }
    if (faltaConsentimiento && !aceptaNormas) {
      toast.error("Debes aceptar los Términos y las normas de venta para crear la tienda.");
      return;
    }

    setEnviando(true);
    try {
      if (LOCAL_CATALOG) {
        const logoUrl = logo ? await localFileUrl(logo) : "";
        const portadaUrl = portada ? await localFileUrl(portada) : logoUrl;
        createLocalStore({ id: slugUnico(nombre), nombre: nombre.trim(), propietario: dueno,
          rnc: rnc.trim(), descripcion: descripcion.trim(), categoria: cat?.nombre ?? "",
          ubicacion, logo: logoUrl, portada: portadaUrl, verificado: false, destacado: false,
          rating: 0, resenas: 0, seguidores: 0, productos: 0 }, session.user.id);
        await router.invalidate();
        toast.success("¡Tu tienda está lista!");
        router.history.push("/publicar");
        return;
      }
      if (CLOUDFLARE_API) {
        const logoUrl = logo ? await cloudUpload(logo) : "";
        const coverUrl = portada ? await cloudUpload(portada) : logoUrl;
        await api("/api/stores", { method: "POST", body: JSON.stringify({ name: nombre, rnc,
          description: descripcion, category: cat?.nombre, location: ubicacion, logo: logoUrl, cover: coverUrl }) });
        await router.invalidate();
        toast.success("¡Tu tienda está lista!");
        router.history.push("/publicar");
        return;
      }
      let logoUrl: string | null = null;
      let portadaUrl: string | null = null;
      if (logo) logoUrl = await subirImagen(logo, session.user.id);
      if (portada) portadaUrl = await subirImagen(portada, session.user.id);

      const { error } = await supabase.from("stores").insert({
        id: slugUnico(nombre),
        owner_id: session.user.id,
        owner_name: dueno,
        name: nombre.trim(),
        rnc: rnc.trim() || null,
        description: descripcion.trim() || null,
        category: cat?.nombre ?? null,
        location: ubicacion || null,
        logo: logoUrl,
        cover: portadaUrl,
      });
      if (error) throw new Error(error.message);

      const [nombres, ...resto] = dueno.split(" ");
      const apellidos = resto.join(" ");
      await supabase
        .from("profiles")
        .update({
          first_name: nombres,
          last_name: apellidos,
          full_name: dueno,
        })
        .eq("id", session.user.id)
        .or("first_name.is.null,last_name.is.null");

      if (faltaConsentimiento && aceptaNormas) {
        await supabase
          .from("profiles")
          .update({
            terms_accepted_at: new Date().toISOString(),
            consent_version: "2026-09",
          })
          .eq("id", session.user.id)
          .is("terms_accepted_at", null);
      }

      toast.success("¡Tu tienda está lista!");
      router.history.push("/publicar");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No pudimos crear la tienda.");
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

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="card-uniko p-8">
          <h1 className="text-xl font-bold">Necesitas una cuenta</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Inicia sesión o crea tu cuenta gratis para abrir tu tienda en UNIKO-RD.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              to="/auth"
              search={{ redirect: "/vender", modo: "crear" }}
              className="btn-base btn-brand"
            >
              Crear cuenta
            </Link>
            <Link
              to="/auth"
              search={{ redirect: "/vender", modo: "entrar" }}
              className="btn-base btn-outline"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (cargandoTiendas) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Cargando tu información…</p>
      </div>
    );
  }

  if (misTiendas && misTiendas.length > 0 && misTiendas[0]) {
    const tienda = misTiendas[0];
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="card-uniko p-8">
          <Store className="mx-auto h-10 w-10 text-brand" />
          <h1 className="mt-4 text-xl font-bold">Ya tienes una tienda</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tu tienda “{tienda.name}” está activa. Publica productos para que aparezcan en el
            marketplace.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link to="/publicar" className="btn-base btn-brand">
              Publicar un producto
            </Link>
            <Link
              to="/tiendas/$tiendaId"
              params={{ tiendaId: tienda.id }}
              className="btn-base btn-outline"
            >
              Ver mi tienda
            </Link>
            <Link to="/ordenes" className="btn-base btn-outline">
              Órdenes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl sm:text-3xl">Abre tu tienda en UNIKO-RD</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Crea tu perfil de negocio y empieza a vender en toda República Dominicana. Es gratis.
      </p>

      <form onSubmit={crear} className="card-uniko mt-6 grid gap-5 p-6">
        <Campo label="Nombre de la tienda">
          <input
            type="text"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Tech Store RD"
            className="input-uniko"
          />
        </Campo>

        <Campo label="Nombre y apellido del propietario">
          <input
            type="text"
            required
            value={propietario}
            onChange={(e) => setPropietario(e.target.value)}
            placeholder="Ej: María Pérez"
            className="input-uniko"
            maxLength={80}
          />
          <span className="text-[11px] text-muted-foreground">
            Aparecerá como responsable público de la tienda.
          </span>
        </Campo>

        <div className="grid gap-5 sm:grid-cols-2">
          <Campo label="RNC (opcional)">
            <input
              type="text"
              value={rnc}
              onChange={(e) => setRnc(e.target.value)}
              placeholder="1-30-12345-6"
              className="input-uniko"
              inputMode="numeric"
            />
          </Campo>
          <Campo label="Ubicación">
            <select
              required
              value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value)}
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
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Cuéntale a tus clientes qué vende tu tienda, desde cuándo opera y qué la hace especial…"
            className="input-uniko min-h-24 resize-y"
            maxLength={600}
          />
        </Campo>

        <div className="grid gap-5 sm:grid-cols-2">
          <Campo label="Categoría">
            <select
              required
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="select-uniko"
            >
              <option value="">Selecciona…</option>
              {categoriasVender.map((c: Categoria) => (
                <option key={c.slug} value={c.slug}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Campo label="Logo (opcional)">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background px-3 py-3 text-xs font-semibold text-muted-foreground hover:border-brand hover:text-brand">
              <Upload className="h-4 w-4" />
              {logo ? logo.name : "Subir logo (PNG o JPG)"}
              <input
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={(e) => {
                  const archivo = e.target.files?.[0] ?? null;
                  if (archivo && !["image/png", "image/jpeg"].includes(archivo.type)) {
                    toast.error("El logo debe ser una imagen PNG o JPG.");
                    e.target.value = "";
                    setLogo(null);
                    return;
                  }
                  setLogo(archivo);
                }}
              />
            </label>
          </Campo>
          <Campo label="Foto de portada (opcional)">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background px-3 py-3 text-xs font-semibold text-muted-foreground hover:border-brand hover:text-brand">
              <Upload className="h-4 w-4" />
              {portada ? portada.name : "Subir portada"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setPortada(e.target.files?.[0] ?? null)}
              />
            </label>
          </Campo>
        </div>

        {faltaConsentimiento && (
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-background p-4">
            <Checkbox
              checked={aceptaNormas}
              onCheckedChange={(v) => setAceptaNormas(v === true)}
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
              </Link>
              , sus normas de venta y la{" "}
              <Link
                to="/legal/$doc"
                params={{ doc: "privacidad" }}
                target="_blank"
                className="font-semibold text-brand underline"
              >
                Política de Privacidad
              </Link>
              .
            </span>
          </label>
        )}

        <button type="submit" disabled={enviando} className="btn-base btn-brand">
          <Store className="h-4 w-4" />
          {enviando ? "Creando tu tienda…" : "Crear mi tienda"}
        </button>
        <p className="text-center text-xs text-muted-foreground">
          Al crear tu tienda confirmas que la información es veraz y aceptas las normas de venta de
          UNIKO-RD.
        </p>
      </form>
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
