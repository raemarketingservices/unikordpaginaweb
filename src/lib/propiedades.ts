// Módulo inmobiliario «Tu próximo hogar está en Uniko»: agentes/inmobiliarias y propiedades.
import { supabase } from "./supabase";

export const ESLOGAN = "Tu próximo hogar está en Uniko";

export type Agente = {
  id: string;
  tipo: "inmobiliaria" | "agente";
  nombre: string;
  telefono: string | null;
  whatsapp: string | null;
  email: string | null;
  logo: string | null;
  descripcion: string | null;
  licencia: string | null;
  provincia: string | null;
  approved?: boolean;
};

export type Propiedad = {
  id: string;
  agent_id: string;
  titulo: string;
  operacion: keyof typeof OPERACIONES;
  tipo: keyof typeof TIPOS;
  precio: number;
  moneda: "DOP" | "USD";
  periodo: "noche" | "mes" | null;
  habitaciones: number | null;
  banos: number | null;
  parqueos: number | null;
  metros: number | null;
  provincia: string | null;
  sector: string | null;
  descripcion: string | null;
  fotos: string[];
  amenidades: string[];
  lat: number | null;
  lng: number | null;
  approved?: boolean;
  created_at: string;
  property_agents?: Agente | null;
};

export const OPERACIONES = {
  venta: "En venta",
  alquiler: "En alquiler",
  alquiler_temporal: "Alquiler por noches",
} as const;

export const TIPOS = {
  casa: "Casa",
  apartamento: "Apartamento",
  villa: "Villa",
  solar: "Solar / terreno",
  local: "Local comercial",
  oficina: "Oficina",
  habitacion: "Habitación",
} as const;

export const AMENIDADES = [
  "Piscina",
  "Aire acondicionado",
  "Amueblado",
  "Wi-Fi",
  "Planta eléctrica",
  "Seguridad 24/7",
  "Ascensor",
  "Terraza",
  "Patio",
  "Gimnasio",
  "Vista al mar",
  "Admite mascotas",
];

export function precioTexto(p: Pick<Propiedad, "precio" | "moneda" | "periodo" | "operacion">) {
  const n = new Intl.NumberFormat("es-DO", { maximumFractionDigits: 0 }).format(p.precio);
  const base = `${p.moneda === "USD" ? "US$" : "RD$"}${n}`;
  if (p.operacion === "venta") return base;
  return `${base} / ${p.periodo ?? (p.operacion === "alquiler_temporal" ? "noche" : "mes")}`;
}

/** wa.me exige solo dígitos; los números de RD de 10 dígitos llevan el 1 delante. */
export function enlaceWhatsapp(numero: string, texto: string) {
  let d = numero.replace(/\D/g, "");
  if (d.length === 10) d = `1${d}`;
  return `https://wa.me/${d}?text=${encodeURIComponent(texto)}`;
}

const CON_AGENTE = "*, property_agents(*)";

export async function fetchPropiedades(): Promise<Propiedad[]> {
  const { data, error } = await supabase
    .from("properties")
    .select(CON_AGENTE)
    .eq("approved", true)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Propiedad[];
}

export async function fetchPropiedad(id: string): Promise<Propiedad | null> {
  const { data, error } = await supabase.from("properties").select(CON_AGENTE).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data as Propiedad | null;
}

export async function fetchMiAgente(userId: string): Promise<Agente | null> {
  const { data } = await supabase.from("property_agents").select("*").eq("id", userId).maybeSingle();
  return data as Agente | null;
}

export async function fetchMisPropiedades(userId: string): Promise<Propiedad[]> {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("agent_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Propiedad[];
}

export async function fetchPropiedadesAdmin(): Promise<Propiedad[]> {
  const { data, error } = await supabase
    .from("properties")
    .select(CON_AGENTE)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Propiedad[];
}
