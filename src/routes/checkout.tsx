import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { formatearRD } from "@/data/marketplace";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { CompraAcceso } from '@/components/uniko/CompraAcceso';
import { supabase } from "@/lib/supabase";
import { api, CLOUDFLARE_API } from "@/lib/cloudflare";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [{ title: "Finalizar compra · UNIKO-RD" }, { name: "robots", content: "noindex" }],
  }),
  component: CheckoutPagina,
});

const EMAIL_RE = /^\S+@\S+\.\S+$/;

function CheckoutPagina() {
  const { items, total, vaciar } = useCart();
  const { session, profile, loading } = useAuth();

  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [cedula, setCedula] = useState("");
  const [nota, setNota] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    if (!profile && !session) return;
    setNombre((v) => v || profile?.full_name || "");
    setCorreo((v) => v || profile?.email || session?.user.email || "");
    setCedula((v) => v || profile?.cedula || "");
    setTelefono((v) => v || profile?.phone || "");
  }, [profile, session]);

  const enviar = async (e: React.FormEvent) => {
    if (!session) { e.preventDefault(); return; }
    e.preventDefault();
    if (enviando) return;

    if (nombre.trim().length < 3) {
      toast.error("Escribe tu nombre completo.");
      return;
    }
    if (direccion.trim().length < 5) {
      toast.error("Escribe tu dirección de entrega.");
      return;
    }
    if ((telefono.match(/\d/g) ?? []).length < 10) {
      toast.error("Escribe un teléfono válido (10 dígitos).");
      return;
    }
    if (!EMAIL_RE.test(correo.trim())) {
      toast.error("Escribe un correo electrónico válido.");
      return;
    }
    if (cedula.replace(/\D/g, "").length < 7) {
      toast.error("Escribe tu cédula o RNC válido.");
      return;
    }
    if (!items.length) {
      toast.error("Tu carrito está vacío.");
      return;
    }

    setEnviando(true);
    try {
      const nombresTiendas = [...new Set(items.map((i) => i.tienda).filter(Boolean))];
      if (CLOUDFLARE_API) {
        const tiendasRows = await api<{ id: string; name: string }[]>("/api/stores");
        const storeIds = tiendasRows.filter((store) => nombresTiendas.includes(store.name)).map((store) => store.id);
        await api("/api/purchase-requests", { method: "POST", body: JSON.stringify({
          full_name: nombre.trim(), address: direccion.trim(), phone: telefono.trim(), email: correo.trim(),
          cedula: cedula.trim(), note: nota.trim(), items: items.map((i) => ({ id: i.id, titulo: i.titulo,
            tienda: i.tienda, precio: i.precio, cantidad: i.cantidad })), store_ids: storeIds, total,
        }) });
        setEnviado(true); vaciar(); toast.success("¡Solicitud de compra enviada!");
        return;
      }
      const { data: tiendasRows } = await supabase
        .from("stores")
        .select("id, name")
        .in("name", nombresTiendas);
      const storeIds = (tiendasRows ?? []).map((t) => t.id as string);

      const { error } = await supabase.from("purchase_requests").insert({
        full_name: nombre.trim(),
        address: direccion.trim(),
        phone: telefono.trim(),
        email: correo.trim(),
        cedula: cedula.trim(),
        note: nota.trim() || null,
        items: items.map((i) => ({
          id: i.id,
          titulo: i.titulo,
          tienda: i.tienda,
          precio: i.precio,
          cantidad: i.cantidad,
        })),
        store_ids: storeIds,
        total,
        source: "web",
        user_id: session?.user.id ?? null,
      });
      if (error) throw new Error(error.message);
      setEnviado(true);
      vaciar();
      toast.success("¡Solicitud de compra enviada!");

      // Aviso WhatsApp a los vendedores (mejor esfuerzo, no bloquea la compra)
      void fetch("/api/whatsapp/avisar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "buyer",
          nombre: nombre.trim(),
          telefono: telefono.trim(),
          total,
          tiendas: nombresTiendas,
        }),
      }).catch(() => undefined);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? `No pudimos enviar tu solicitud: ${err.message}`
          : "No pudimos enviar tu solicitud. Intenta de nuevo.",
      );
    } finally {
      setEnviando(false);
    }
  };

  if (enviado) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-success" />
        <h1 className="mt-4 text-2xl sm:text-3xl">¡Solicitud de compra enviada!</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Recibimos tus datos de contacto y el detalle de tu pedido. Te escribiremos a{" "}
          <strong className="text-foreground">{correo}</strong> o al {telefono} para coordinar la
          entrega y el pago en República Dominicana.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/productos" className="btn-base btn-brand">
            Seguir comprando
          </Link>
          <Link to="/cuenta" className="btn-base btn-outline">
            Mi cuenta
          </Link>
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl sm:text-3xl">Tu carrito está vacío</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Agrega productos antes de solicitar tu compra.
        </p>
        <Link to="/productos" className="btn-base btn-brand mt-6 inline-flex">
          Explorar productos
        </Link>
      </div>
    );
  }

  const campo = "input-uniko w-full";

  if (loading) return <p className="p-8">Cargando…</p>;
  if (!session) return <section className="card-uniko mx-auto my-8 max-w-md p-6"><h1 className="mb-4 text-2xl">Inicia sesión para comprar</h1><CompraAcceso redirect="/checkout" /></section>;
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl sm:text-3xl">Datos para tu compra</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Completa tus datos y te contactamos para coordinar la entrega y el pago.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <form onSubmit={enviar} className="card-uniko grid gap-4 p-6" noValidate>
          <div className="grid gap-1.5">
            <label htmlFor="co-nombre" className="text-sm font-semibold">
              Nombre completo *
            </label>
            <input
              id="co-nombre"
              className={campo}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. María Pérez"
              autoComplete="name"
            />
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="co-direccion" className="text-sm font-semibold">
              Dirección de entrega *
            </label>
            <input
              id="co-direccion"
              className={campo}
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Calle, número, sector, ciudad, provincia"
              autoComplete="street-address"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label htmlFor="co-telefono" className="text-sm font-semibold">
                Teléfono *
              </label>
              <input
                id="co-telefono"
                className={campo}
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="809-555-0199"
                inputMode="tel"
                autoComplete="tel"
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="co-correo" className="text-sm font-semibold">
                Correo electrónico *
              </label>
              <input
                id="co-correo"
                type="email"
                className={campo}
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="co-cedula" className="text-sm font-semibold">
              Cédula o RNC *
            </label>
            <input
              id="co-cedula"
              className={campo}
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              placeholder="001-1234567-8"
              inputMode="numeric"
            />
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="co-nota" className="text-sm font-semibold">
              Nota (opcional)
            </label>
            <textarea
              id="co-nota"
              className={`${campo} min-h-24 resize-y`}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Indicaciones de entrega, referencias del localidad, horarios, etc."
            />
          </div>

          <button
            type="submit"
            disabled={enviando}
            className="btn-base btn-brand flex w-full items-center justify-center gap-2"
          >
            {enviando ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando solicitud…
              </>
            ) : (
              "Enviar solicitud de compra"
            )}
          </button>

          <p className="inline-flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Usamos tus datos únicamente para atender tu compra, conforme a la{" "}
            <Link
              to="/legal/$doc"
              params={{ doc: "privacidad" }}
              className="font-semibold text-primary underline"
            >
              Política de Privacidad
            </Link>
            .
          </p>
        </form>

        <aside className="card-uniko h-fit p-5">
          <h2 className="text-lg font-bold">Tu pedido</h2>
          <ul className="mt-3 grid gap-2 text-sm">
            {items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3">
                <span className="min-w-0 truncate text-muted-foreground">
                  {i.cantidad} × {i.titulo}
                </span>
                <span className="shrink-0 font-semibold">{formatearRD(i.precio * i.cantidad)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
            <span className="font-bold">Total:</span>
            <span className="text-xl font-bold text-brand">{formatearRD(total)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
