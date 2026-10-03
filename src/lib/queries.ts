import { supabase } from "./supabase";
import { LOCAL_CATALOG } from "./local-catalog";
import { getLocalData, updateLocalData } from "./local-db";
import { api, CLOUDFLARE_API } from "./cloudflare";
import type {
  CategoriaRow,
  ChatbotSettingsRow,
  PageBlockRow,
  ProductWithStoreRow,
  ProfileRow,
  ServiceRow,
  StoreRow,
} from "./types";
import type { Categoria, Producto, Servicio, Tienda } from "@/data/marketplace";

function fallo(message: string): never {
  throw new Error(message);
}

// --- Mapeadores (filas DB -> tipos de la app) ------------------------

function mapCategoria(c: CategoriaRow): Categoria {
  const tipo: Categoria["tipo"] = c.tipo === "producto" || c.tipo === "servicio" ? c.tipo : "ambos";
  return { slug: c.id, nombre: c.name, icono: c.icon ?? "Package", tipo };
}

function asArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string") { try { return asArray(JSON.parse(value)); } catch { return []; } }
  return [];
}

function mapProducto(r: ProductWithStoreRow): Producto {
  const p: Producto = {
    id: r.id,
    titulo: r.title,
    categoria: r.category ?? "otros",
    precio: r.price,
    tienda: r.stores?.name ?? "",
    verificado: r.verified,
    rating: Number(r.rating),
    resenas: r.reviews,
    ubicacion: r.location ?? "",
    envioNacional: r.shipping,
    imagen: r.image ?? "",
    destacado: r.featured,
    masVendido: r.best_seller,
    nuevo: r.is_new,
  };
  if (r.compare_at_price != null) p.precioAnterior = r.compare_at_price;
  if (r.store_id) p.tiendaId = r.store_id;
  if (r.sku) p.sku = r.sku;
  if (r.description) p.descripcion = r.description;
  const gallery = asArray(r.gallery);
  const videos = asArray(r.videos);
  if (gallery.length) p.galeria = gallery;
  if (videos.length) p.videos = videos;
  return p;
}

function mapServicio(r: ServiceRow): Servicio {
  const s: Servicio = {
    id: r.id,
    titulo: r.title,
    categoria: r.category ?? "otros",
    desde: r.price_from,
    proveedor: r.provider ?? "",
    verificado: r.verified,
    rating: Number(r.rating),
    resenas: r.reviews,
    ubicacion: r.location ?? "",
    cobertura: r.coverage ?? "",
    imagen: r.image ?? "",
  };
  if (r.recommended) s.recomendado = true;
  return s;
}

function mapTienda(r: StoreRow): Tienda {
  const t: Tienda = {
    id: r.id,
    nombre: r.name,
    categoria: r.category ?? "",
    ubicacion: r.location ?? "",
    verificado: r.verified,
    rating: Number(r.rating),
    resenas: r.reviews,
    seguidores: r.followers,
    productos: r.products_count,
    logo: r.logo ?? "",
    portada: r.cover ?? "",
  };
  if (r.featured) t.destacado = true;
  if (r.rnc) t.rnc = r.rnc;
  if (r.description) t.descripcion = r.description;
  if (r.owner_name) t.propietario = r.owner_name;
  return t;
}

// --- Fetchers públicos ----------------------------------------------

export async function fetchCategorias(): Promise<Categoria[]> {
  if (LOCAL_CATALOG) return getLocalData().categories;
  if (CLOUDFLARE_API) return (await api<CategoriaRow[]>("/api/categories")).map(mapCategoria);
  const { data, error } = await supabase
    .from("categories")
    .select("id,name,icon,tipo,position")
    .order("position");
  if (error) fallo(error.message);
  return (data ?? []).map(mapCategoria);
}

export async function fetchProductos(): Promise<Producto[]> {
  if (LOCAL_CATALOG) return getLocalData().products;
  if (CLOUDFLARE_API) {
    const [products, stores] = await Promise.all([api<ProductRow[]>("/api/products"), api<StoreRow[]>("/api/stores")]);
    return products.map((product) => mapProducto({ ...product,
      gallery: asArray(product.gallery), videos: asArray(product.videos),
      stores: { name: stores.find((store) => store.id === product.store_id)?.name,
        verified: stores.find((store) => store.id === product.store_id)?.verified },
    }));
  }
  const { data, error } = await supabase
    .from("products")
    .select("*, stores(name, verified)")
    .order("created_at", { ascending: false });
  if (error) fallo(error.message);
  return ((data ?? []) as ProductWithStoreRow[]).map(mapProducto);
}

export async function fetchServicios(): Promise<Servicio[]> {
  if (LOCAL_CATALOG) return getLocalData().services;
  if (CLOUDFLARE_API) return (await api<ServiceRow[]>("/api/services")).map(mapServicio);
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) fallo(error.message);
  return ((data ?? []) as ServiceRow[]).map(mapServicio);
}

export async function fetchTiendas(): Promise<Tienda[]> {
  if (LOCAL_CATALOG) return getLocalData().stores;
  if (CLOUDFLARE_API) return (await api<StoreRow[]>("/api/stores")).map(mapTienda);
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .order("featured", { ascending: false });
  if (error) fallo(error.message);
  return ((data ?? []) as StoreRow[]).map(mapTienda);
}

export async function fetchBloquesHome(): Promise<PageBlockRow[]> {
  if (LOCAL_CATALOG) return [];
  if (CLOUDFLARE_API) return (await api<PageBlockRow[]>("/api/page-blocks")).filter((b) => b.enabled);
  const { data, error } = await supabase
    .from("page_blocks")
    .select("*")
    .eq("page", "home")
    .eq("enabled", true)
    .order("position");
  if (error) fallo(error.message);
  return (data ?? []) as PageBlockRow[];
}

export async function fetchTodosBloques(): Promise<PageBlockRow[]> {
  if (LOCAL_CATALOG) return [];
  if (CLOUDFLARE_API) return api<PageBlockRow[]>("/api/page-blocks");
  const { data, error } = await supabase
    .from("page_blocks")
    .select("*")
    .eq("page", "home")
    .order("position");
  if (error) fallo(error.message);
  return (data ?? []) as PageBlockRow[];
}

export type HomeData = {
  bloques: PageBlockRow[];
  categorias: Categoria[];
  productos: Producto[];
  servicios: Servicio[];
  tiendas: Tienda[];
};

export async function fetchHome(): Promise<HomeData> {
  const [bloques, categorias, productos, servicios, tiendas] = await Promise.all([
    fetchBloquesHome(),
    fetchCategorias(),
    fetchProductos(),
    fetchServicios(),
    fetchTiendas(),
  ]);
  return { bloques, categorias, productos, servicios, tiendas };
}

// --- Utilidades ------------------------------------------------------

export function slugify(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function slugUnico(base: string): string {
  const limpio = slugify(base) || "item";
  return `${limpio}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function subirImagen(file: File, carpeta: string): Promise<string> {
  const permitidos = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "video/mp4",
    "video/webm",
    "video/quicktime",
  ];
  if (!permitidos.includes(file.type))
    fallo("Usa fotos JPG, PNG, WebP o GIF, o videos MP4, WebM o MOV.");
  const limite = file.type.startsWith("video/") ? 50 : 10;
  if (file.size > limite * 1024 * 1024) fallo(`El archivo ${file.name} supera ${limite} MB.`);
  const extension = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const path = `${carpeta}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("marketplace").upload(path, file, {
    upsert: false,
  });
  if (error) fallo(error.message);
  const { data } = supabase.storage.from("marketplace").getPublicUrl(path);
  return data.publicUrl;
}

export async function subirArchivos(files: File[], carpeta: string): Promise<string[]> {
  if (files.length > 10) fallo("Puedes subir hasta 10 archivos por tipo.");
  const urls: string[] = [];
  for (const file of files) {
    urls.push(await subirImagen(file, carpeta));
  }
  return urls;
}

// --- SKU -------------------------------------------------------------

export function generarSku(): string {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let sufijo = "";
  for (let i = 0; i < 6; i++) {
    sufijo += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  }
  return `UNIK-${sufijo}`;
}

// --- Ratings de tiendas ----------------------------------------------

export async function fetchMiRating(storeId: string, userId: string): Promise<number | null> {
  if (LOCAL_CATALOG) return getLocalData().ratings[`${storeId}:${userId}`] ?? null;
  if (CLOUDFLARE_API) {
    const row = await api<{ rating?: number } | null>(`/api/ratings?store_id=${encodeURIComponent(storeId)}`);
    return row?.rating ?? null;
  }
  const { data, error } = await supabase
    .from("store_ratings")
    .select("rating")
    .eq("store_id", storeId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) fallo(error.message);
  return data ? Number(data.rating) : null;
}

export async function guardarRating(
  storeId: string,
  userId: string,
  rating: number,
): Promise<void> {
  if (LOCAL_CATALOG) {
    updateLocalData((data) => {
      data.ratings[`${storeId}:${userId}`] = rating;
      const scores = Object.entries(data.ratings).filter(([key]) => key.startsWith(`${storeId}:`)).map(([, value]) => value);
      const store = data.stores.find((s) => s.id === storeId);
      if (store) { store.resenas = scores.length; store.rating = scores.reduce((a, b) => a + b, 0) / scores.length; }
    });
    return;
  }
  if (CLOUDFLARE_API) {
    await api("/api/ratings", { method: "POST", body: JSON.stringify({ store_id: storeId, rating }) });
    return;
  }
  const { error } = await supabase
    .from("store_ratings")
    .upsert({ store_id: storeId, user_id: userId, rating });
  if (error) fallo(error.message);
}

// --- Configuración del chatbot ---------------------------------------

export const CONFIG_CHATBOT_ID = "default";

const CONFIG_CHATBOT_PREDETERMINADA: ChatbotSettingsRow = {
  id: CONFIG_CHATBOT_ID,
  enabled: true,
  greeting:
    "¡Hola! Soy UNIKO, el asistente de UNIKO-RD. Pregúntame por productos, precios, ofertas o tiendas.",
  allowed_stores: ["*"],
  updated_at: "",
};

export async function fetchConfigChatbot(): Promise<ChatbotSettingsRow> {
  if (LOCAL_CATALOG) return getLocalData().chatbot;
  if (CLOUDFLARE_API) {
    const row = await api<ChatbotSettingsRow & { allowed_stores: string | string[] }>("/api/chatbot");
    return { ...row, enabled: Boolean(row.enabled), allowed_stores: asArray(row.allowed_stores) };
  }
  const { data, error } = await supabase
    .from("chatbot_settings")
    .select("*")
    .eq("id", CONFIG_CHATBOT_ID)
    .maybeSingle();
  if (error) fallo(error.message);
  return (data as ChatbotSettingsRow | null) ?? CONFIG_CHATBOT_PREDETERMINADA;
}

export async function fetchConocimientoChatbot() {
  if (LOCAL_CATALOG) {
    const data = getLocalData();
    const allowed = data.chatbot.allowed_stores;
    const tiendas = allowed.includes("*") ? data.stores : data.stores.filter((s) => allowed.includes(s.id));
    return { categorias: data.categories, servicios: data.services, tiendas,
      productos: data.products.filter((p) => tiendas.some((s) => s.id === p.tiendaId)), cfg: data.chatbot };
  }
  if (CLOUDFLARE_API) {
    const [cfg, categorias, servicios, tiendas, productos] = await Promise.all([
      fetchConfigChatbot(), fetchCategorias(), fetchServicios(), fetchTiendas(), fetchProductos(),
    ]);
    const allowed = cfg.allowed_stores;
    const visibleStores = allowed.includes("*") ? tiendas : tiendas.filter((s) => allowed.includes(s.id));
    return { cfg, categorias, servicios, tiendas: visibleStores,
      productos: productos.filter((p) => visibleStores.some((s) => s.id === p.tiendaId)) };
  }
  const { data, error } = await supabase.rpc("marketplace_chatbot_catalog");
  if (error) fallo(error.message);
  return {
    cfg: data.cfg as ChatbotSettingsRow,
    productos: (data.products as ProductWithStoreRow[]).map(mapProducto),
    tiendas: (data.stores as StoreRow[]).map(mapTienda),
    servicios: (data.services as ServiceRow[]).map(mapServicio),
    categorias: (data.categories as CategoriaRow[]).map(mapCategoria),
  };
}

export async function guardarConfigChatbot(cfg: {
  enabled: boolean;
  greeting: string;
  allowed_stores: string[];
}): Promise<void> {
  if (LOCAL_CATALOG) {
    updateLocalData((data) => { data.chatbot = { ...data.chatbot, ...cfg, updated_at: new Date().toISOString() }; });
    return;
  }
  if (CLOUDFLARE_API) {
    await api("/api/admin/chatbot_settings/default", { method: "PATCH", body: JSON.stringify(cfg) });
    return;
  }
  const { error } = await supabase
    .from("chatbot_settings")
    .upsert({ id: CONFIG_CHATBOT_ID, ...cfg });
  if (error) fallo(error.message);
}

// --- Consultas de administración -------------------------------------

export async function fetchPerfilesAdmin() {
  if (CLOUDFLARE_API) return api<ProfileRow[]>("/api/admin/profiles");
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) fallo(error.message);
  return (data ?? []) as ProfileRow[];
}

export async function fetchTiendasAdmin() {
  if (CLOUDFLARE_API) return api<StoreRow[]>("/api/admin/stores");
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) fallo(error.message);
  return (data ?? []) as StoreRow[];
}

export async function fetchProductosAdmin() {
  if (CLOUDFLARE_API) {
    const [products, stores] = await Promise.all([api<ProductRow[]>("/api/admin/products"), api<StoreRow[]>("/api/stores")]);
    return products.map((p) => ({ ...p, gallery: asArray(p.gallery), videos: asArray(p.videos),
      stores: { name: stores.find((s) => s.id === p.store_id)?.name } }));
  }
  const { data, error } = await supabase
    .from("products")
    .select("*, stores(name)")
    .order("created_at", { ascending: false });
  if (error) fallo(error.message);
  return (data ?? []) as ProductWithStoreRow[];
}
