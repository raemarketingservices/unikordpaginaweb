import type { ProfileRow } from "./types";

const base = ((import.meta.env["VITE_CLOUDFLARE_API_URL"] as string | undefined) ?? "https://uniko-marketplace.aqui-rd.workers.dev").replace(/\/$/, "");
export const CLOUDFLARE_API = import.meta.env["VITE_LOCAL_CATALOG"] !== "true";
const TOKEN = "unikord.cloudflare.session";

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!base) throw new Error("La API de Cloudflare no está configurada.");
  const headers = new Headers(init.headers);
  const token = typeof window === "undefined" ? null : sessionStorage.getItem(TOKEN);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${base}${path}`, { ...init, headers });
  const result = await response.json().catch(() => null) as { error?: string } | T | null;
  if (!response.ok) throw new Error((result && typeof result === "object" && "error" in result && result.error) || `Error HTTP ${response.status}`);
  return result as T;
}

export async function cloudLogin(email: string, password: string, admin = false): Promise<ProfileRow> {
  const result = await api<{ token: string; profile: ProfileRow }>(admin ? "/api/auth/admin" : "/api/auth/login", {
    method: "POST", body: JSON.stringify(admin ? { password } : { email, password }),
  });
  sessionStorage.setItem(TOKEN, result.token);
  return result.profile;
}

export async function cloudRegister(input: Record<string, unknown>): Promise<ProfileRow> {
  const result = await api<{ token: string; profile: ProfileRow }>("/api/auth/register", {
    method: "POST", body: JSON.stringify(input),
  });
  sessionStorage.setItem(TOKEN, result.token);
  return result.profile;
}

export async function cloudLogout(): Promise<void> {
  try { await api("/api/auth/logout", { method: "POST" }); } finally { sessionStorage.removeItem(TOKEN); }
}

export async function cloudCurrentProfile(): Promise<ProfileRow | null> {
  if (!sessionStorage.getItem(TOKEN)) return null;
  try { return (await api<{ profile: ProfileRow }>("/api/auth/me")).profile; }
  catch { sessionStorage.removeItem(TOKEN); return null; }
}

export async function cloudUpload(file: File): Promise<string> {
  const response = await fetch(`${base}/api/uploads`, {
    method: "POST", headers: { "Content-Type": file.type, Authorization: `Bearer ${sessionStorage.getItem(TOKEN) ?? ""}` }, body: file,
  });
  const result = await response.json() as { url?: string; error?: string };
  if (!response.ok || !result.url) throw new Error(result.error ?? "No se pudo subir el archivo.");
  return result.url;
}
