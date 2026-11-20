// «Uniko Afiliados»: rastreo de enlaces ?ref=, vitrina y consultas del panel.
import { supabase } from "./supabase";

export const PROGRAMA = "Uniko Afiliados";
export const VERSION_TERMINOS = "2026-11";
const DIAS_COOKIE = 30;
const CLAVE = "uniko.ref";

export type Tema = {
  titulo?: string;
  bio?: string;
  color?: string;
  boton_color?: string;
  boton_texto?: string;
  boton_forma?: "pill" | "redondeado" | "recto";
  disposicion?: "cuadricula" | "lista";
};

export const TEMA_BASE: Required<Tema> = {
  titulo: "Mis recomendados",
  bio: "Productos que uso y recomiendo, todos en UNIKO-RD.",
  color: "#0b3fae",
  boton_color: "#cd002b",
  boton_texto: "Comprar ahora",
  boton_forma: "pill",
  disposicion: "cuadricula",
};

export type Afiliado = {
  id: string;
  slug: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  metodo_pago: string | null;
  status: "activo" | "pausado";
  commission_rate: number;
  terms_accepted_at: string;
  theme: Tema;
  created_at: string;
};

export type Comision = {
  id: string;
  affiliate_id: string;
  purchase_request_id: string;
  product_id: string | null;
  producto: string | null;
  cantidad: number;
  monto_venta: number;
  tasa: number;
  comision: number;
  status: "pendiente" | "aprobada" | "pagada" | "anulada";
  created_at: string;
};

export type ProductoVitrina = {
  id: string;
  titulo: string;
  precio: number;
  precio_anterior: number | null;
  imagen: string | null;
  tienda: string;
};

export type Vitrina = { slug: string; nombre: string; theme: Tema; productos: ProductoVitrina[] };

/** Enlace único por producto: /productos/<id>?ref=<nombre-apellido-id>. */
export const enlaceAfiliado = (slug: string, productId: string) =>
  `${typeof window !== "undefined" ? window.location.origin : "https://uniko-rd.com"}/productos/${productId}?ref=${slug}`;

export const enlaceVitrina = (slug: string) =>
  `${typeof window !== "undefined" ? window.location.origin : "https://uniko-rd.com"}/afiliados/${slug}`;

// ---- Rastreo (localStorage, 30 días, el último enlace gana) -----------------------
type Refs = Record<string, { slug: string; t: number }>;

function leerRefs(): Refs {
  try {
    const r = JSON.parse(localStorage.getItem(CLAVE) ?? "{}") as Refs;
    const limite = Date.now() - DIAS_COOKIE * 864e5;
    return Object.fromEntries(Object.entries(r).filter(([, v]) => v.t > limite));
  } catch {
    return {};
  }
}

/** Llamar al abrir un producto: si viene ?ref=, se guarda y se cuenta el clic (1 por sesión). */
export function capturarRef(productId: string, ref: string | null | undefined) {
  const slug = (ref ?? "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 80);
  if (!slug) return;
  try {
    const refs = leerRefs();
    refs[productId] = { slug, t: Date.now() };
    localStorage.setItem(CLAVE, JSON.stringify(refs));
    const visto = `uniko.ref.clic.${slug}.${productId}`;
    if (sessionStorage.getItem(visto)) return;
    sessionStorage.setItem(visto, "1");
  } catch {
    // Sin almacenamiento (modo privado): la venta no se podrá atribuir, el clic sí.
  }
  void supabase.rpc("registrar_clic_afiliado", { p_slug: slug, p_product: productId });
}

/** Para el checkout: el ref vigente de un producto, si lo hay. */
export const refDe = (productId: string): string | undefined => leerRefs()[productId]?.slug;

// ---- Consultas ---------------------------------------------------------------------
export async function fetchVitrina(slug: string): Promise<Vitrina | null> {
  const { data, error } = await supabase.rpc("vitrina_afiliado", { p_slug: slug });
  if (error) throw new Error(error.message);
  return (data as Vitrina | null) ?? null;
}

export async function fetchMiAfiliado(userId: string): Promise<Afiliado | null> {
  const { data } = await supabase.from("affiliates").select("*").eq("id", userId).maybeSingle();
  return data as Afiliado | null;
}

export type Metricas = { clics: number; conversiones: number; unidades: number; ingresos: number; porEstado: Record<Comision["status"], number> };

export function calcularMetricas(clics: number, comisiones: Comision[]): Metricas {
  const vivas = comisiones.filter((c) => c.status !== "anulada");
  const porEstado = { pendiente: 0, aprobada: 0, pagada: 0, anulada: 0 };
  for (const c of comisiones) porEstado[c.status] += Number(c.comision);
  return {
    clics,
    conversiones: new Set(vivas.map((c) => c.purchase_request_id)).size,
    unidades: vivas.reduce((s, c) => s + c.cantidad, 0),
    ingresos: vivas.reduce((s, c) => s + Number(c.monto_venta), 0),
    porEstado,
  };
}

export const ESTADO_COMISION: Record<Comision["status"], { label: string; pill: string }> = {
  pendiente: { label: "Pendiente", pill: "bg-amber-500/15 text-amber-700" },
  aprobada: { label: "Aprobada", pill: "bg-primary/10 text-primary" },
  pagada: { label: "Pagada", pill: "bg-emerald-500/15 text-emerald-700" },
  anulada: { label: "Anulada", pill: "bg-muted text-muted-foreground" },
};
