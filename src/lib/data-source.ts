export type DataSource = "cloudflare" | "supabase" | "local";

const raw = import.meta.env["VITE_DATA_SOURCE"];

/** Un solo selector: `VITE_LOCAL_CATALOG` también decidía Cloudflare y Supabase era inalcanzable. */
export const DATA_SOURCE: DataSource = raw === "supabase" || raw === "local" ? raw : "cloudflare";
