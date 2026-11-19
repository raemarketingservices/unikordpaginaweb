import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

// POST /api/delivery/sacha  { orderId, province? }  ·  Authorization: Bearer <sesión del vendedor/admin>
// Crea la guía en Sacha Pack (queda «pendiente» para despacho) y la registra en la orden.
// La clave de Sacha vive solo en el servidor (SACHA_API_KEY / SACHA_STORE_ID).
const SUPABASE_URL = (import.meta.env["VITE_SUPABASE_URL"] as string | undefined) ?? "https://uniko-rd.com";
const SUPABASE_ANON = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined;
const SACHA_URL = "https://sachapack.com/api/logistics-webhook";

type Item = { id?: string; titulo?: string; precio?: number; cantidad?: number };

const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

export const Route = createFileRoute("/api/delivery/sacha")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["SACHA_API_KEY"];
        const storeId = process.env["SACHA_STORE_ID"];
        if (!apiKey || !storeId) return json(503, { error: "Sacha Pack aún no está configurado en el servidor." });
        if (!SUPABASE_ANON) return json(500, { error: "Falta la configuración de Supabase." });

        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return json(401, { error: "Inicia sesión." });

        let body: { orderId?: unknown; province?: unknown };
        try {
          body = await request.json();
        } catch {
          return json(400, { error: "JSON inválido." });
        }
        const orderId = typeof body.orderId === "string" ? body.orderId : "";
        if (!/^[0-9a-f-]{36}$/i.test(orderId)) return json(400, { error: "Orden inválida." });

        // Todo con la sesión de quien llama: RLS y `puede_despachar` deciden el permiso.
        const sb = createClient(SUPABASE_URL, SUPABASE_ANON, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const permiso = await sb.rpc("puede_despachar", { p_id: orderId });
        if (permiso.error || permiso.data !== true) return json(403, { error: "No puedes despachar esta orden." });

        const { data: orden, error } = await sb.from("purchase_requests").select("*").eq("id", orderId).single();
        if (error || !orden) return json(404, { error: "Orden no encontrada." });
        if (orden.sacha_tracking) return json(409, { error: "Esta orden ya se envió con Sacha Pack.", tracking: orden.sacha_tracking });

        const province = (typeof body.province === "string" && body.province.trim()) || orden.province;
        if (!province) return json(400, { error: "Indica la provincia de entrega." });

        const externalOrderId = `UNIKO-${orderId.slice(0, 8).toUpperCase()}`;
        const payload = {
          storeId,
          externalOrderId,
          paymentMethod: "contra entrega",
          items: ((orden.items ?? []) as Item[]).map((it) => ({
            barcode_imei: it.id ?? "UNIKO",
            quantity: Number(it.cantidad) || 1,
            price: Number(it.precio) || 0,
            name: it.titulo ?? "Producto UNIKO-RD",
          })),
          customer: {
            name: orden.full_name,
            phone: String(orden.phone ?? "").replace(/\D/g, ""),
            address: orden.address,
            province,
          },
        };

        let respuesta: Record<string, unknown> = {};
        try {
          const r = await fetch(SACHA_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-API-KEY": apiKey },
            body: JSON.stringify(payload),
          });
          respuesta = (await r.json().catch(() => ({}))) as Record<string, unknown>;
          if (!r.ok) {
            const msg = String(respuesta["error"] ?? respuesta["message"] ?? `HTTP ${r.status}`);
            return json(502, { error: `Sacha Pack rechazó el envío: ${msg}` });
          }
        } catch {
          return json(502, { error: "No se pudo conectar con Sacha Pack." });
        }

        const datos = (respuesta["data"] ?? {}) as Record<string, unknown>;
        const tracking = String(
          respuesta["trackingNumber"] ?? datos["trackingNumber"] ?? respuesta["guia"] ?? respuesta["id"] ?? externalOrderId,
        );
        const reg = await sb.rpc("registrar_envio_sacha", { p_id: orderId, p_tracking: tracking, p_province: province });
        if (reg.error) return json(500, { error: `La guía se creó (${tracking}) pero no se pudo guardar en la orden.` });

        return json(200, { ok: true, tracking });
      },
    },
  },
});
