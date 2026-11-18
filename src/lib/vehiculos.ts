// Módulo de renta de vehículos «Tu movilidad empieza en Uniko».
import { supabase } from "./supabase";

export const ESLOGAN_AUTOS = "Tu movilidad empieza en Uniko";

export type Proveedor = {
  id: string;
  tipo: "rentacar" | "particular";
  nombre: string;
  telefono: string | null;
  whatsapp: string | null;
  email: string | null;
  logo: string | null;
  descripcion: string | null;
  provincia: string | null;
  approved?: boolean;
};

export type Vehiculo = {
  id: string;
  provider_id: string;
  marca: string;
  modelo: string;
  anio: number;
  color: string | null;
  tipo: keyof typeof TIPOS_VEHICULO;
  transmision: "automatica" | "manual";
  combustible: keyof typeof COMBUSTIBLES;
  pasajeros: number;
  puertas: number | null;
  kilometraje: number | null;
  tarifa_dia: number;
  moneda: "DOP" | "USD";
  deposito: number | null;
  provincia: string | null;
  descripcion: string | null;
  fotos: string[];
  extras: string[];
  lat: number | null;
  lng: number | null;
  approved?: boolean;
  created_at: string;
  vehicle_providers?: Proveedor | null;
};

export const TIPOS_VEHICULO = {
  sedan: "Sedán",
  compacto: "Compacto",
  jeepeta: "Jeepeta / SUV",
  camioneta: "Camioneta",
  minivan: "Minivan / Van",
  deportivo: "Deportivo",
  motor: "Motor",
} as const;

export const COMBUSTIBLES = {
  gasolina: "Gasolina",
  diesel: "Diésel",
  hibrido: "Híbrido",
  electrico: "Eléctrico",
  glp: "GLP",
} as const;

export const EXTRAS = [
  "Aire acondicionado",
  "Bluetooth",
  "GPS",
  "Cámara de reversa",
  "Apple CarPlay / Android Auto",
  "Seguro incluido",
  "Entrega a domicilio",
  "Recogida en aeropuerto",
  "Kilometraje ilimitado",
  "Silla para niños",
];

export function dinero(monto: number, moneda: "DOP" | "USD") {
  const n = new Intl.NumberFormat("es-DO", { maximumFractionDigits: 0 }).format(monto);
  return `${moneda === "USD" ? "US$" : "RD$"}${n}`;
}

export const nombreVehiculo = (v: Pick<Vehiculo, "marca" | "modelo" | "anio">) =>
  `${v.marca} ${v.modelo} ${v.anio}`;

const CON_PROVEEDOR = "*, vehicle_providers(*)";

export async function fetchVehiculos(): Promise<Vehiculo[]> {
  const { data, error } = await supabase
    .from("vehicles")
    .select(CON_PROVEEDOR)
    .eq("approved", true)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Vehiculo[];
}

export async function fetchVehiculo(id: string): Promise<Vehiculo | null> {
  const { data, error } = await supabase.from("vehicles").select(CON_PROVEEDOR).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data as Vehiculo | null;
}

export async function fetchMiProveedor(userId: string): Promise<Proveedor | null> {
  const { data } = await supabase.from("vehicle_providers").select("*").eq("id", userId).maybeSingle();
  return data as Proveedor | null;
}

export async function fetchMisVehiculos(userId: string): Promise<Vehiculo[]> {
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("provider_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Vehiculo[];
}

export async function fetchVehiculosAdmin(): Promise<Vehiculo[]> {
  const { data, error } = await supabase
    .from("vehicles")
    .select(CON_PROVEEDOR)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Vehiculo[];
}
