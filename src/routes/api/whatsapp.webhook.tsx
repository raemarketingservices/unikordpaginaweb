import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/whatsapp/webhook")({
  server: {
    handlers: {
      // Verificacion que hace Meta al registrar el webhook.
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");

        if (mode === "subscribe" && token === process.env["META_WA_VERIFY_TOKEN"]) {
          return new Response(challenge ?? "", {
            headers: { "Content-Type": "text/plain" },
          });
        }
        return new Response("Forbidden", { status: 403 });
      },

      POST: async ({ request }) => {
        let body: any;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const phoneId = process.env["META_WA_PHONE_NUMBER_ID"];
        const token = process.env["META_WA_TOKEN"];

        const mensaje = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
        if (!mensaje) {
          return new Response("Webhook processed", { status: 200 });
        }

        const senderPhone = String(mensaje.from || "")
          .replace(/\D/g, "")
          .replace(/^0/, "");

        const texto =
          mensaje.type === "text" && mensaje.text?.body ? String(mensaje.text.body) : "";

        // Auto-respuesta segun palabras clave (solo dentro de la ventana de 24h).
        const bajo = texto.toLowerCase().trim();
        let respuesta = "";
        if (!texto) {
          respuesta = "";
        } else if (bajo.includes("hola") || bajo.includes("buenas")) {
          respuesta = "Hola! Gracias por escribir a UNIKO-RD. En que podemos ayudarte?";
        } else if (bajo.includes("precio") || bajo.includes("cuanto")) {
          respuesta = "Los precios varian segun el producto. Cuentanos que buscas y te ayudamos.";
        } else if (bajo.includes("orden") || bajo.includes("pedido") || bajo.includes("compra")) {
          respuesta = "Recibimos tu mensaje sobre tu orden. Un vendedor te contactara pronto.";
        } else if (bajo.includes("estado")) {
          respuesta =
            "Para ver el estado de tu orden entra a UNIKO-RD/ordenes o responde con tu numero de orden.";
        } else {
          respuesta = "Gracias por escribirnos. Pronto te respondemos.";
        }

        if (respuesta && phoneId && token && senderPhone) {
          try {
            const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                to: senderPhone,
                type: "text",
                text: { body: respuesta },
              }),
            });
            if (!res.ok) {
              console.error("Meta API auto-respuesta", res.status, await res.text());
            }
          } catch (err) {
            console.error("Error al enviar respuesta WhatsApp:", err);
          }
        }

        return new Response("Webhook processed", { status: 200 });
      },
    },
  },
});
