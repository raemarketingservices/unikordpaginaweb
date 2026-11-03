import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { LOCAL_CATALOG } from "./local-catalog";
import { currentLocalUser, isLocalAdmin, signOutLocal, signOutLocalAdmin } from "./local-db";
import { api, CLOUDFLARE_API, cloudCurrentProfile, cloudLogout } from "./cloudflare";
import type { ProfileRow } from "./types";

type AuthState = {
  session: Session | null;
  profile: ProfileRow | null;
  loading: boolean;
  isAdmin: boolean;
  refrescarPerfil: () => Promise<void>;
  salir: () => Promise<void>;
  refreshLocal: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(!LOCAL_CATALOG);
  const [localAdmin, setLocalAdmin] = useState(false);
  const ultimaCarga = useRef<string | null>(null);

  const cargarPerfil = async (s: Session | null) => {
    if (!s) {
      setProfile(null);
      return;
    }
    const { data } = await supabase.from("profiles").select("*").eq("id", s.user.id).maybeSingle();
    setProfile((data as ProfileRow | null) ?? null);
  };

  useEffect(() => {
    if (LOCAL_CATALOG) {
      const refresh = () => {
        const user = currentLocalUser();
        setProfile(user);
        setSession(user ? ({ user: { id: user.id, email: user.email } } as Session) : null);
        setLocalAdmin(isLocalAdmin());
      };
      refresh();
      window.addEventListener("unikord:changed", refresh);
      return () => window.removeEventListener("unikord:changed", refresh);
    }
    if (CLOUDFLARE_API) {
      let active = true;
      cloudCurrentProfile().then((p) => {
        if (!active) return;
        setProfile(p);
        setSession(p ? ({ user: { id: p.id, email: p.email } } as Session) : null);
        setLoading(false);
      }).catch(() => setLoading(false));
      return () => { active = false; };
    }
    let activo = true;

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!activo) return;
        setSession(data.session);
        ultimaCarga.current = data.session?.user.id ?? null;
        await cargarPerfil(data.session);
        if (activo) setLoading(false);
      })
      .catch(() => {
        if (activo) setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_evento, s) => {
      setSession(s);
      const uid = s?.user.id ?? null;
      if (uid && uid !== ultimaCarga.current) {
        ultimaCarga.current = uid;
        void cargarPerfil(s);
      } else if (!uid) {
        ultimaCarga.current = null;
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      activo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const valor: AuthState = {
    session,
    profile,
    loading,
    isAdmin: LOCAL_CATALOG ? localAdmin : profile?.role === "admin",
    refrescarPerfil: async () => {
      if (LOCAL_CATALOG) setProfile(currentLocalUser());
      else if (CLOUDFLARE_API) setProfile(await cloudCurrentProfile());
      else await cargarPerfil(session);
    },
    salir: async () => {
      if (LOCAL_CATALOG) {
        signOutLocal();
        signOutLocalAdmin();
        setSession(null);
        setProfile(null);
        setLocalAdmin(false);
      } else if (CLOUDFLARE_API) {
        try { await cloudLogout(); }
        finally { setSession(null); setProfile(null); }
      } else await supabase.auth.signOut();
    },
    refreshLocal: () => {
      const user = currentLocalUser();
      setProfile(user);
      setSession(user ? ({ user: { id: user.id, email: user.email } } as Session) : null);
      setLocalAdmin(isLocalAdmin());
      if (CLOUDFLARE_API) void cloudCurrentProfile().then((p) => {
        setProfile(p);
        setSession(p ? ({ user: { id: p.id, email: p.email } } as Session) : null);
      });
    },
  };

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
