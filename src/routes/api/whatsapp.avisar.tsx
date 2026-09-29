import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/whatsapp/avisar")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: any;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const role = body?.role;
        const nombre = typeof body?.nombre === "string" ? body.nombre.trim() : "";
        const telefono =
          typeof body?.telefono === "string" ? body.telefono.trim() : "";
        const total = Number(body?.total) || 0;
        const estado = typeof body?.estado === "string" ? body.estado.trim() : "";
        const tiendas: string[] = Array.isArray(body?.tiendas)
          ? body.tiendas.filter((t: unknown): t is string => typeof t === "string")
          : [];

        if (role !== "buyer" && role !== "seller") {
          return new Response("Invalid role", { status: 400 });
        }

        const phoneId = process.env["META_WA_PHONE_NUMBER_ID"];
        const token = process.env["META_WA_TOKEN"];

        if (!phoneId || !token) {
          return new Response("WhatsApp config missing", { status: 500 });
        }

        const formatearRD = (valor: number) =>
          `RD$${valor.toLocaleString("es-DO", { maximumFractionDigits: 2 })}`;

        // Numeros locales dominicanos (10 digitos) se envian con prefijo 1.
        const normalizar = (raw: string) => {
          const soloDigitos = raw.replace(/\D/g, "");
          if (!soloDigitos) return "";
          if (soloDigitos.length === 10) return `1${soloDigitos}`;
          return soloDigitos;
        };

        const enviar = async (para: string, texto: string) => {
          const destino = normalizar(para);
          if (!destino) return { ok: false, motivo: "telefono invalido" };
          try {
            const res = await fetch(
              `https://graph.facebook.com/v20.0/${phoneId}/messages`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  messaging_product: "whatsapp",
                  to: destino,
                  type: "text",
                  text: { body: texto },
                }),
              },
            );
            const textoRes = await res.text();
            if (!res.ok) {
              console.error("Meta API", res.status, textoRes);
              return { ok: false, motivo: textoRes.slice(0, 300) };
            }
            return { ok: true, motivo: "" };
          } catch (err) {
            console.error("Error enviando WhatsApp:", err);
            return { ok: false, motivo: String(err) };
          }
        };

        if (role === "buyer") {
          // Nuevo pedido: avisar a los vendedores de las tiendas involucradas.
          const telefonos = await vendedoresDeTiendas(tiendas);
          if (!telefonos.length) {
            return Response.json({
              ok: false,
              enviados: 0,
              motivo: "sin telefonos de vendedores",
            });
          }
          const texto =
            "Nueva orden en UNIKO-RD!\n" +
            `Cliente: ${nombre || "-"}\n` +
            `Tel: ${telefono || "-"}\n` +
            `Total: ${formatearRD(total)}\n` +
            `Tienda${tiendas.length > 1 ? "s" : ""}: ${tiendas.join(", ") || "-"}\n` +
            "Gestionala desde tu panel de Ordenes en UNIKO-RD.";
          const resultados = await Promise.all(
            telefonos.map((t) => enviar(t, texto)),
          );
          const enviados = resultados.filter((r) => r.ok).length;
          return Response.json({
            ok: enviados > 0,
            enviados,
            motivo: resultados.find((r) => !r.ok)?.motivo ?? "",
          });
        }

        // role === "seller": avisar al comprador (confirmacion o cambio de estado)
        if (!telefono) {
          return new Response("Missing telefono", { status: 400 });
        }
        const texto = estado
          ? `Hola ${nombre || "cliente"}, tu orden en UNIKO-RD cambio de estado a *${estado}*. Total: ${formatearRD(total)}. Dudas? Responde a este mensaje.`
          : `Hola ${nombre || "cliente"}, gracias por tu compra en UNIKO-RD! Recibimos tu orden por ${formatearRD(total)}. Te contactamos pronto para coordinar entrega y pago.`;
        const r = await enviar(telefono, texto);
        return Response.json({ ok: r.ok, enviados: r.ok ? 1 : 0, motivo: r.motivo });
      },
    },
  },
});

// Security definer: solo devuelve telefonos de duenos de tiendas consultadas.
async function vendedoresDeTiendas(tiendas: string[]): Promise<string[]> {
  if (!tiendas.length) return [];
  const { createClient } = await import("@supabase/supabase-js");
  const url =
    process.env["SUPABASE_URL"] ??
    process.env["VITE_SUPABASE_URL"] ??
    "https://uniko-rd.com";
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ??
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ??
    "sb_publishable_qDTaqHyWWdy92o7G6InGDJ_WEugr_zv";

  const cliente = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await cliente.rpc("tienda_contactos", {
    nombres: tiendas,
  });
  if (error) {
    console.error("tienda_contactos:", error.message);
    return [];
  }
  return ((data as string[] | null) ?? []).filter(Boolean);
}
