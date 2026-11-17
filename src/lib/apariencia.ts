// Apariencia global editable desde /admin → «Apariencia»: tipografía y reglas
// «texto original → texto nuevo» que se aplican en toda la web (y la app/APK).
import { supabase } from "./supabase";

export type Reemplazo = { de: string; a: string };
export type Apariencia = {
  font_family: string;
  base_size: number;
  heading_weight: number;
  body_weight: number;
  headings_uppercase: boolean;
  replacements: Reemplazo[];
};

export const FUENTES = [
  "Montserrat",
  "Poppins",
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Nunito",
  "Raleway",
  "Merriweather",
  "Playfair Display",
] as const;

export const APARIENCIA_BASE: Apariencia = {
  font_family: "Montserrat",
  base_size: 16,
  heading_weight: 700,
  body_weight: 400,
  headings_uppercase: false,
  replacements: [],
};

export async function fetchApariencia(): Promise<Apariencia> {
  const { data } = await supabase.from("site_appearance").select("*").eq("id", "global").maybeSingle();
  return data ? { ...APARIENCIA_BASE, ...(data as Partial<Apariencia>) } : APARIENCIA_BASE;
}

export async function guardarApariencia(a: Apariencia) {
  const { error } = await supabase
    .from("site_appearance")
    .update({ ...a, updated_at: new Date().toISOString() })
    .eq("id", "global");
  if (error) throw new Error(error.message);
}

export function aplicarApariencia(a: Apariencia) {
  const fuente = (FUENTES as readonly string[]).includes(a.font_family) ? a.font_family : "Montserrat";
  const html = document.documentElement;
  const pila = `"${fuente}", ui-sans-serif, system-ui, sans-serif`;
  html.style.setProperty("--font-sans", pila);
  html.style.setProperty("--font-display", pila);
  html.style.fontSize = `${a.base_size}px`;

  const idLink = "uniko-fuente";
  const href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fuente)}:wght@300;400;500;600;700;800;900&display=swap`;
  let link = document.getElementById(idLink) as HTMLLinkElement | null;
  if (!link) {
    link = Object.assign(document.createElement("link"), { id: idLink, rel: "stylesheet" });
    document.head.append(link);
  }
  if (link.href !== href) link.href = href;

  let estilo = document.getElementById("uniko-apariencia");
  if (!estilo) {
    estilo = Object.assign(document.createElement("style"), { id: "uniko-apariencia" });
    document.head.append(estilo);
  }
  estilo.textContent = `body{font-weight:${a.body_weight}}h1,h2,h3,h4{font-weight:${a.heading_weight};text-transform:${a.headings_uppercase ? "uppercase" : "none"}}`;

  reglas = a.replacements.filter((r) => r.de.trim());
  aplicarReemplazos(document.body);
  if (!observador) {
    observador = new MutationObserver((cambios) => {
      for (const c of cambios) {
        if (c.type === "characterData") reemplazarNodo(c.target as Text);
        else c.addedNodes.forEach((n) => aplicarReemplazos(n));
      }
    });
    observador.observe(document.body, { childList: true, subtree: true, characterData: true });
  }
}

// ponytail: reemplazo por nodos de texto del DOM (sin tocar cada componente); exacto y
// sensible a mayúsculas. Si un día hacen falta textos por pantalla, migrar a claves i18n.
let reglas: Reemplazo[] = [];
let observador: MutationObserver | null = null;
const ultimo = new WeakMap<Text, string>();
const SALTAR = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "CODE", "NOSCRIPT"]);

function reemplazarNodo(nodo: Text) {
  if (!reglas.length || ultimo.get(nodo) === nodo.data) return;
  const padre = nodo.parentElement;
  if (!padre || SALTAR.has(padre.tagName) || padre.isContentEditable) return;
  let texto = nodo.data;
  for (const r of reglas) if (texto.includes(r.de)) texto = texto.split(r.de).join(r.a);
  ultimo.set(nodo, texto); // evita bucles si «a» contiene a «de»
  if (texto !== nodo.data) nodo.data = texto;
}

function aplicarReemplazos(raiz: Node) {
  if (!reglas.length) return;
  if (raiz.nodeType === Node.TEXT_NODE) return reemplazarNodo(raiz as Text);
  const recorrido = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
  for (let n = recorrido.nextNode(); n; n = recorrido.nextNode()) reemplazarNodo(n as Text);
}
