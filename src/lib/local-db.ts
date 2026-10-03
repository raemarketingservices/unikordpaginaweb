import { localCatalog } from "./local-catalog";
import type { Categoria, Producto, Servicio, Tienda } from "@/data/marketplace";
import type { ChatbotSettingsRow, ProfileRow } from "./types";

type LocalUser = ProfileRow & { passwordHash: string; salt: string };
export type LocalData = {
  users: LocalUser[];
  stores: Tienda[];
  products: Producto[];
  services: Servicio[];
  categories: Categoria[];
  storeOwners: Record<string, string>;
  ratings: Record<string, number>;
  chatbot: ChatbotSettingsRow;
  home: { headline: string; subtitle: string };
};

const KEY = "unikord.local.v1";
const USER_KEY = "unikord.user";
const ADMIN_KEY = "unikord.admin";

function initial(): LocalData {
  return {
    users: [],
    stores: localCatalog.tiendas.map((s) => ({ ...s })),
    products: localCatalog.productos.map((p) => ({ ...p })),
    services: localCatalog.servicios.map((s) => ({ ...s })),
    categories: localCatalog.categorias.map((c) => ({ ...c })),
    storeOwners: {},
    ratings: {},
    chatbot: {
      id: "default",
      enabled: true,
      greeting: "¡Hola! Puedo ayudarte a encontrar productos y tiendas en UNIKO-RD.",
      allowed_stores: ["*"],
      updated_at: "",
    },
    home: { headline: "Todo lo que buscas. En un solo lugar.",
      subtitle: "Compra productos, descubre negocios dominicanos y encuentra profesionales para todo lo que necesitas." },
  };
}

export function getLocalData(): LocalData {
  if (typeof window === "undefined") return initial();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initial();
    const saved = JSON.parse(raw) as LocalData;
    return { ...initial(), ...saved };
  } catch {
    return initial();
  }
}

export function saveLocalData(data: LocalData): void {
  localStorage.setItem(KEY, JSON.stringify(data));
  window.dispatchEvent(new Event("unikord:changed"));
}

export function updateLocalData(change: (data: LocalData) => void): void {
  const data = getLocalData();
  change(data);
  saveLocalData(data);
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (n) => n.toString(16).padStart(2, "0")).join("");
}

export async function registerLocalUser(input: {
  email: string; password: string; firstName: string; lastName: string;
  cedula: string; phone: string; role: "user" | "vendor";
}): Promise<ProfileRow> {
  const data = getLocalData();
  const email = input.email.trim().toLowerCase();
  if (data.users.some((u) => u.email === email)) throw new Error("Ese correo ya está registrado.");
  const salt = crypto.randomUUID();
  const user: LocalUser = {
    id: crypto.randomUUID(), email, first_name: input.firstName.trim(),
    last_name: input.lastName.trim(), full_name: `${input.firstName.trim()} ${input.lastName.trim()}`,
    cedula: input.cedula.trim() || null, phone: input.phone.trim() || null,
    role: input.role, avatar_url: null, created_at: new Date().toISOString(),
    salt, passwordHash: await hashPassword(input.password, salt),
  };
  data.users.push(user);
  saveLocalData(data);
  sessionStorage.setItem(USER_KEY, user.id);
  return user;
}

export async function signInLocal(email: string, password: string): Promise<ProfileRow> {
  const user = getLocalData().users.find((u) => u.email === email.trim().toLowerCase());
  if (!user || user.passwordHash !== await hashPassword(password, user.salt)) {
    throw new Error("Correo o contraseña incorrectos.");
  }
  sessionStorage.setItem(USER_KEY, user.id);
  return user;
}

export function currentLocalUser(): ProfileRow | null {
  if (typeof window === "undefined") return null;
  return getLocalData().users.find((u) => u.id === sessionStorage.getItem(USER_KEY)) ?? null;
}

export function signOutLocal(): void {
  sessionStorage.removeItem(USER_KEY);
}

export function signInLocalAdmin(password: string): boolean {
  if (password !== "unicoadmin") return false;
  sessionStorage.setItem(ADMIN_KEY, "true");
  return true;
}

export function isLocalAdmin(): boolean {
  return typeof window !== "undefined" && sessionStorage.getItem(ADMIN_KEY) === "true";
}

export function signOutLocalAdmin(): void {
  sessionStorage.removeItem(ADMIN_KEY);
}

export function createLocalStore(store: Tienda, ownerId: string): void {
  updateLocalData((data) => {
    data.stores.unshift(store);
    data.storeOwners[store.id] = ownerId;
  });
}

export function localStoreForOwner(ownerId: string): Tienda | null {
  const data = getLocalData();
  return data.stores.find((s) => data.storeOwners[s.id] === ownerId) ?? null;
}

export function addLocalProduct(product: Producto): void {
  updateLocalData((data) => {
    data.products.unshift(product);
    const store = data.stores.find((s) => s.id === product.tiendaId);
    if (store) store.productos += 1;
  });
}

export async function localFileUrl(file: File): Promise<string> {
  if (file.size > 1.5 * 1024 * 1024) throw new Error(`${file.name}: máximo 1.5 MB por archivo en modo local.`);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`No se pudo leer ${file.name}.`));
    reader.readAsDataURL(file);
  });
}
