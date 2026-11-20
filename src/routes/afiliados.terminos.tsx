import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { VERSION_TERMINOS } from "@/lib/afiliados";

export const Route = createFileRoute("/afiliados/terminos")({
  head: () => ({ meta: [{ title: "Guías y política de privacidad · Uniko Afiliados" }] }),
  component: Terminos,
});

const SECCIONES: { titulo: string; parrafos: string[] }[] = [
  {
    titulo: "1. Quién puede participar",
    parrafos: [
      "Cualquier persona mayor de 18 años con una cuenta en UNIKO-RD, que se registre con su nombre y apellido reales y acepte estas guías.",
      "UNIKO-RD puede aprobar, pausar o cerrar una cuenta de afiliado en cualquier momento si se incumplen estas reglas.",
    ],
  },
  {
    titulo: "2. Cómo funcionan los enlaces",
    parrafos: [
      "Cada afiliado tiene un enlace único por producto (con su nombre, apellido e identificador) y una vitrina pública.",
      "Cuando una persona entra por tu enlace, guardamos tu referencia en su navegador durante 30 días. Si compra ese producto en ese plazo, la venta se te atribuye. Si entra luego por el enlace de otro afiliado, cuenta el último enlace usado.",
      "No se atribuyen comisiones por compras hechas por el propio afiliado (autorreferidos).",
    ],
  },
  {
    titulo: "3. Comisiones",
    parrafos: [
      "La comisión estándar es el 10 % del precio del producto vendido (sin envío), salvo que el administrador acuerde otra tasa contigo. Se calcula con el precio publicado en UNIKO-RD, no con otros valores.",
      "Estados: «Pendiente» al hacerse el pedido; «Aprobada» cuando el pedido se completa; «Anulada» si el pedido se cancela o devuelve; «Pagada» cuando UNIKO-RD te transfiere.",
      "Los pagos se hacen al método de pago que indiques en tu panel, en los plazos que comunique UNIKO-RD. Eres responsable de tus obligaciones fiscales ante la DGII.",
    ],
  },
  {
    titulo: "4. Uso de marca y promoción permitida",
    parrafos: [
      "Puedes compartir tus enlaces en redes sociales, WhatsApp, tu web o en persona. Debes dejar claro que recibes una comisión cuando sea relevante.",
      "Está prohibido: spam o mensajes masivos no solicitados; publicidad engañosa (precios, ofertas o características falsas); hacerte pasar por UNIKO-RD o por una tienda; comprar anuncios con la marca «UNIKO-RD» o «Uniko» como palabra clave; generar clics o compras falsas.",
      "Puedes usar el nombre y logo de UNIKO-RD solo para promocionar tus enlaces, sin modificarlos ni sugerir una relación laboral.",
    ],
  },
  {
    titulo: "5. Política de privacidad de Uniko Afiliados",
    parrafos: [
      "Datos del afiliado: nombre, apellido, teléfono y método de pago, usados para identificarte, mostrar tu nombre en tu vitrina y pagarte. Tu teléfono y método de pago no se muestran en público.",
      "Datos de los visitantes: registramos cuántas veces se abre cada enlace (fecha y producto) y guardamos la referencia en el navegador del visitante (almacenamiento local) para atribuir la venta. No compartimos con el afiliado los datos personales de quien compra; solo ve el producto, el importe y el estado de la comisión.",
      "Tratamos estos datos conforme a la Ley 172-13 de protección de datos personales de la República Dominicana y la política de privacidad general de UNIKO-RD. Puedes pedir acceso, corrección o baja escribiéndonos.",
    ],
  },
  {
    titulo: "6. Cambios",
    parrafos: [
      "Podemos actualizar estas guías; te avisaremos en tu panel y la nueva versión aplicará a partir de su publicación.",
    ],
  },
];

function Terminos() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary">
        <ShieldCheck className="h-4 w-4" /> Uniko Afiliados · versión {VERSION_TERMINOS}
      </p>
      <h1 className="mt-2 text-2xl sm:text-3xl">Guías del programa y política de privacidad</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Aceptarlas es obligatorio para registrarte y promocionar productos como afiliado.
      </p>
      <div className="mt-6 grid gap-4">
        {SECCIONES.map((s) => (
          <section key={s.titulo} className="card-uniko p-5">
            <h2 className="text-lg">{s.titulo}</h2>
            {s.parrafos.map((p) => (
              <p key={p} className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
      <Link to="/afiliados/panel" className="btn-base btn-brand mt-6">
        Ir a mi panel de afiliado
      </Link>
    </div>
  );
}
