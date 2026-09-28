import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { ProfileRow } from "./types";

type AuthState = {
  session: Session | null;
  profile: ProfileRow | null;
  loading: boolean;
  isAdmin: boolean;
  refrescarPerfil: () => Promise<void>;
  salir: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
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
    let activo = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!activo) return;
      setSession(data.session);
      ultimaCarga.current = data.session?.user.id ?? null;
      await cargarPerfil(data.session);
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
    isAdmin: profile?.role === "admin",
    refrescarPerfil: async () => {
      await cargarPerfil(session);
    },
    salir: async () => {
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
