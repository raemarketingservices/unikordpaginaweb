import { createClient } from "@supabase/supabase-js";
import { LOCAL_CATALOG } from "./local-catalog";

const SUPABASE_URL = import.meta.env["VITE_SUPABASE_URL"] ?? "https://uniko-rd.com";
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ??
  "sb_publishable_qDTaqHyWWdy92o7G6InGDJ_WEugr_zv";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: !LOCAL_CATALOG,
    autoRefreshToken: !LOCAL_CATALOG,
    detectSessionInUrl: !LOCAL_CATALOG,
  },
});
