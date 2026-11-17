// Captcha anti-bots de Cloudflare Turnstile. Supabase Auth (GoTrue) valida el token en
// registro e inicio de sesión. La site key es pública; la secreta vive solo en el homelab.
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

const SITE_KEY =
  (import.meta.env["VITE_TURNSTILE_SITE_KEY"] as string | undefined) ?? "0x4AAAAAAGFndTqg0AmyzijO";
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type Turnstile = {
  render: (el: HTMLElement, o: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let cargando: Promise<Turnstile> | null = null;
function cargarTurnstile(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  cargando ??= new Promise((resolve, reject) => {
    const s = Object.assign(document.createElement("script"), { src: SCRIPT, async: true });
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile")));
    s.onerror = () => {
      cargando = null;
      reject(new Error("No se pudo cargar la verificación anti-bots."));
    };
    document.head.append(s);
  });
  return cargando;
}

export type CaptchaRef = { reset: () => void };

/** Llama `onToken` con el token válido (o null si caduca). Tras un intento fallido, `reset()`. */
export const Captcha = forwardRef<CaptchaRef, { onToken: (t: string | null) => void }>(
  function Captcha({ onToken }, ref) {
    const el = useRef<HTMLDivElement>(null);
    const id = useRef<string | null>(null);
    const cb = useRef(onToken);
    cb.current = onToken;

    useImperativeHandle(ref, () => ({
      reset: () => {
        cb.current(null);
        if (id.current) window.turnstile?.reset(id.current);
      },
    }));

    useEffect(() => {
      let vivo = true;
      cargarTurnstile()
        .then((t) => {
          if (!vivo || !el.current) return;
          id.current = t.render(el.current, {
            sitekey: SITE_KEY,
            language: "es",
            theme: "light",
            callback: (tok: string) => cb.current(tok),
            "expired-callback": () => cb.current(null),
            "error-callback": () => cb.current(null),
          });
        })
        .catch(() => cb.current(null));
      return () => {
        vivo = false;
        if (id.current) window.turnstile?.remove(id.current);
      };
    }, []);

    return <div ref={el} className="flex min-h-[65px] justify-center" />;
  },
);
