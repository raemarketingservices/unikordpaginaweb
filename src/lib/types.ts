// Tipos de filas de Supabase (tablas del esquema public) y configs de bloques.

export type CategoriaRow = {
  id: string;
  name: string;
  icon: string | null;
  tipo: string;
  position: number;
};

export type StoreRow = {
  id: string;
  owner_id: string | null;
  owner_name: string | null;
  name: string;
  rnc: string | null;
  description: string | null;
  category: string | null;
  location: string | null;
  verified: boolean;
  featured: boolean;
  rating: number;
  reviews: number;
  followers: number;
  products_count: number;
  logo: string | null;
  cover: string | null;
  created_at: string;
};

export type ProductRow = {
  id: string;
  store_id: string;
  title: string;
  description: string | null;
  sku: string | null;
  category: string | null;
  price: number;
  compare_at_price: number | null;
  verified: boolean;
  rating: number;
  reviews: number;
  location: string | null;
  shipping: boolean;
  image: string | null;
  gallery: string[] | null;
  videos: string[] | null;
  featured: boolean;
  best_seller: boolean;
  is_new: boolean;
  created_at: string;
};

export type ProductWithStoreRow = ProductRow & {
  stores: { name?: string; verified?: boolean } | null;
};

export type ServiceRow = {
  id: string;
  owner_id: string | null;
  store_id: string | null;
  title: string;
  category: string | null;
  price_from: number;
  provider: string | null;
  verified: boolean;
  rating: number;
  reviews: number;
  location: string | null;
  coverage: string | null;
  image: string | null;
  recommended: boolean;
  created_at: string;
};

export type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  cedula: string | null;
  phone: string | null;
  role: string;
  avatar_url: string | null;
  created_at: string;
};

export type StoreRatingRow = {
  store_id: string;
  user_id: string;
  rating: number;
  created_at: string;
  updated_at: string;
};

export type ChatbotSettingsRow = {
  id: string;
  enabled: boolean;
  greeting: string;
  allowed_stores: string[];
  updated_at: string;
};

export type PageBlockRow = {
  id: string;
  page: string;
  type: string;
  title: string | null;
  subtitle: string | null;
  position: number;
  enabled: boolean;
  config: Record<string, unknown> | null;
  updated_at: string;
};

// --- Configs por tipo de bloque -------------------------------------

export type EnlaceCfg = { to?: string; label?: string };

export type BotonHeroCfg = { label?: string; to?: string; style?: string };

export type StatHeroCfg = { k?: string; v?: string };

export type HeroCfg = {
  eyebrow?: string;
  image?: string;
  buttons?: BotonHeroCfg[];
  stats?: StatHeroCfg[];
};

export type ItemConfianzaCfg = { icon?: string; text?: string };

export type TrustCfg = { items?: ItemConfianzaCfg[] };

export type SeccionCfg = {
  filter?: string;
  limit?: number;
  fondo?: boolean;
  link?: EnlaceCfg;
};

export type CategoriasCfg = {
  limit?: number;
  link?: EnlaceCfg;
};

export type BannerCfg = {
  icon?: string;
  title?: string;
  text?: string;
  button_label?: string;
  to?: string;
  color?: string;
};

export type CtaCfg = { banners?: BannerCfg[] };

export const TIPOS_BLOQUE = [
  "hero",
  "trust_bar",
  "categories",
  "product_section",
  "service_section",
  "store_section",
  "cta_banners",
] as const;

export type TipoBloque = (typeof TIPOS_BLOQUE)[number];

export const NOMBRES_TIPO: Record<TipoBloque, string> = {
  hero: "Hero (portada)",
  trust_bar: "Barra de confianza",
  categories: "Categorías",
  product_section: "Sección de productos",
  service_section: "Sección de servicios",
  store_section: "Sección de tiendas",
  cta_banners: "Banners CTA",
};

export type FiltroProducto = "all" | "offers" | "best_seller" | "is_new" | "featured";
export type FiltroServicio = "all" | "recommended";
export type FiltroTienda = "all" | "featured";

// --- Tipos para Renta de Vehículos ---

export type VehiculoRow = {
  id: string;
  store_id: string;
  nombre: string;
  marca: string;
  modelo: string;
  año: number;
  tipo: 'sedan' | 'suv' | 'van' | 'pickup' | 'moto' | 'otro';
  precio_dia: number;
  disponible: boolean;
  imagenes: string[];
  ubicacion: {
    lat: number;
    lng: number;
    direccion: string;
  };
  caracteristicas: {
    transmision: 'manual' | 'automatica';
    combustible: 'gasolina' | 'diesel' | 'electrico' | 'hibrido';
    pasajeros: number;
    maletas: number;
    puertas: number;
    aire_acondicionado: boolean;
  };
  created_at: string;
  updated_at: string;
};

export type RentaRow = {
  id: string;
  vehiculo_id: string;
  usuario_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias: number;
  precio_total: number;
  estado: 'pendiente' | 'confirmada' | 'en_curso' | 'completada' | 'cancelada';
  ubicacion_recogida: {
    lat: number;
    lng: number;
    direccion: string;
  };
  ubicacion_entrega: {
    lat: number;
    lng: number;
    direccion: string;
  };
  tracking?: {
    lat: number;
    lng: number;
    timestamp: string;
  };
  created_at: string;
  updated_at: string;
};

// --- Tipos para Delivery Tracking ---

export type DeliveryRow = {
  id: string;
  pedido_id: string;
  store_id: string;
  repartidor_id: string | null;
  estado: 'preparando' | 'en_camino' | 'cerca' | 'entregado' | 'cancelado';
  ubicacion_origen: {
    lat: number;
    lng: number;
    direccion: string;
  };
  ubicacion_destino: {
    lat: number;
    lng: number;
    direccion: string;
  };
  ubicacion_actual?: {
    lat: number;
    lng: number;
    timestamp: string;
  };
  tiempo_estimado?: number; // minutos
  distancia?: number; // metros
  created_at: string;
  updated_at: string;
};

export type RepartidorRow = {
  id: string;
  store_id: string;
  nombre: string;
  telefono: string;
  vehiculo: string;
  placa: string;
  foto_url: string | null;
  disponible: boolean;
  ubicacion_actual?: {
    lat: number;
    lng: number;
    timestamp: string;
  };
  created_at: string;
};
