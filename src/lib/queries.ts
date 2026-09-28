import { supabase } from "./supabase";
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
  if (r.gallery && r.gallery.length) p.galeria = r.gallery;
  if (r.videos && r.videos.length) p.videos = r.videos;
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
  const { data, error } = await supabase
    .from("categories")
    .select("id,name,icon,tipo,position")
    .order("position");
  if (error) fallo(error.message);
  return (data ?? []).map(mapCategoria);
}

export async function fetchProductos(): Promise<Producto[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*, stores(name, verified)")
    .order("created_at", { ascending: false });
  if (error) fallo(error.message);
  return ((data ?? []) as ProductWithStoreRow[]).map(mapProducto);
}

export async function fetchServicios(): Promise<Servicio[]> {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) fallo(error.message);
  return ((data ?? []) as ServiceRow[]).map(mapServicio);
}

export async function fetchTiendas(): Promise<Tienda[]> {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .order("featured", { ascending: false });
  if (error) fallo(error.message);
  return ((data ?? []) as StoreRow[]).map(mapTienda);
}

export async function fetchBloquesHome(): Promise<PageBlockRow[]> {
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
  const { data, error } = await supabase
    .from("chatbot_settings")
    .select("*")
    .eq("id", CONFIG_CHATBOT_ID)
    .maybeSingle();
  if (error) fallo(error.message);
  return (data as ChatbotSettingsRow | null) ?? CONFIG_CHATBOT_PREDETERMINADA;
}

export async function fetchConocimientoChatbot() {
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
  const { error } = await supabase
    .from("chatbot_settings")
    .upsert({ id: CONFIG_CHATBOT_ID, ...cfg });
  if (error) fallo(error.message);
}

// --- Consultas de administración -------------------------------------

export async function fetchPerfilesAdmin() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) fallo(error.message);
  return (data ?? []) as ProfileRow[];
}

export async function fetchTiendasAdmin() {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) fallo(error.message);
  return (data ?? []) as StoreRow[];
}

export async function fetchProductosAdmin() {
  const { data, error } = await supabase
    .from("products")
    .select("*, stores(name)")
    .order("created_at", { ascending: false });
  if (error) fallo(error.message);
  return (data ?? []) as ProductWithStoreRow[];
}
