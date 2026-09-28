import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bot, Send, X, MessageCircle } from "lucide-react";
import { fetchConfigChatbot, fetchConocimientoChatbot } from "@/lib/queries";
import { formatearRD } from "@/data/marketplace";
import type { Categoria, Producto, Servicio, Tienda } from "@/data/marketplace";
import type { ChatbotSettingsRow } from "@/lib/types";

type Item = {
  tipo: "producto" | "tienda" | "servicio";
  id: string;
  titulo: string;
  detalle: string;
  imagen?: string;
};

type Mensaje = {
  rol: "bot" | "user";
  texto: string;
  items?: Item[];
};

type Conocimiento = {
  productos: Producto[];
  tiendas: Tienda[];
  servicios: Servicio[];
  categorias: Categoria[];
};

const STOPWORDS = new Set([
  "que",
  "como",
  "cuanto",
  "cuantos",
  "cuales",
  "donde",
  "quiero",
  "quieres",
  "buscar",
  "busco",
  "busca",
  "sobre",
  "para",
  "por",
  "con",
  "una",
  "uno",
  "unos",
  "unas",
  "los",
  "las",
  "del",
  "des",
  "the",
  "and",
  "hay",
  "puedo",
  "puede",
  "dime",
  "muestra",
  "muestra",
  "ver",
  "tengo",
  "este",
  "esta",
  "esto",
  "mas",
  "muy",
  "tengo",
]);

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function tokenizar(texto: string): string[] {
  return normalizar(texto)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

function puntuar(haystack: string, tokens: string[], peso: number): number {
  const texto = normalizar(haystack);
  let puntos = 0;
  for (const t of tokens) {
    if (texto.includes(t)) puntos += peso;
  }
  return puntos;
}

function itemProducto(p: Producto): Item {
  const partes = [formatearRD(p.precio)];
  if (p.tienda) partes.push(p.tienda);
  if (p.ubicacion) partes.push(p.ubicacion);
  return {
    tipo: "producto",
    id: p.id,
    titulo: p.titulo,
    detalle: partes.join(" · "),
    ...(p.imagen ? { imagen: p.imagen } : {}),
  };
}

function itemTienda(t: Tienda): Item {
  const partes = [t.categoria, t.ubicacion, `${t.rating.toFixed(1)}★ (${t.resenas})`].filter(
    Boolean,
  );
  return {
    tipo: "tienda",
    id: t.id,
    titulo: t.nombre,
    detalle: partes.join(" · "),
    ...(t.logo ? { imagen: t.logo } : {}),
  };
}

function itemServicio(s: Servicio): Item {
  const partes = [`desde ${formatearRD(s.desde)}`];
  if (s.proveedor) partes.push(s.proveedor);
  return {
    tipo: "servicio",
    id: s.id,
    titulo: s.titulo,
    detalle: partes.join(" · "),
    ...(s.imagen ? { imagen: s.imagen } : {}),
  };
}

function responder(consulta: string, cfg: ChatbotSettingsRow, k: Conocimiento): Mensaje {
  const texto = normalizar(consulta);
  const tokens = tokenizar(consulta);
  const permitidas = cfg.allowed_stores ?? [];
  const todasLasTiendas = permitidas.includes("*");
  const tiendas = todasLasTiendas ? k.tiendas : k.tiendas.filter((t) => permitidas.includes(t.id));
  const productos = todasLasTiendas
    ? k.productos
    : k.productos.filter((p) => p.tiendaId && permitidas.includes(p.tiendaId));

  if (!tokens.length && texto.trim().length < 2) {
    return { rol: "bot", texto: "Cuéntame qué estás buscando: productos, ofertas o tiendas." };
  }

  if (/^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|saludos)\b/.test(texto)) {
    return {
      rol: "bot",
      texto:
        "¡Hola! Soy UNIKO, el asistente del marketplace. Pregúntame por productos, precios, ofertas o tiendas.",
    };
  }

  if (/(que puedes|ayuda|como funcionas|que sabes)/.test(texto)) {
    return {
      rol: "bot",
      texto:
        "Puedo ayudarte a encontrar productos, comparar precios, ver ofertas y conocer tiendas del marketplace. Prueba con: “ofertas”, “tiendas en Santiago” o “celulares”.",
    };
  }

  if (/(oferta|ofertas|descuento|barato|rebaja)/.test(texto)) {
    const ofertas = productos.filter((p) => p.precioAnterior).slice(0, 4);
    if (ofertas.length) {
      return {
        rol: "bot",
        texto: `Encontré ${ofertas.length} oferta${ofertas.length > 1 ? "s" : ""} activa${ofertas.length > 1 ? "s" : ""}:`,
        items: ofertas.map(itemProducto),
      };
    }
    return { rol: "bot", texto: "Ahora no hay ofertas activas en las tiendas disponibles." };
  }

  if (/(nuevo|nuevos|nuevas|reciente|recientes|ultimos)/.test(texto)) {
    const nuevos = productos.filter((p) => p.nuevo).slice(0, 4);
    if (nuevos.length) {
      return {
        rol: "bot",
        texto: "Estos son los productos recién publicados:",
        items: nuevos.map(itemProducto),
      };
    }
  }

  const tiendaMencionada = tiendas.find((t) => texto.includes(normalizar(t.nombre)));
  if (tiendaMencionada) {
    const propios = productos.filter((p) => p.tiendaId === tiendaMencionada.id).slice(0, 4);
    if (propios.length) {
      return {
        rol: "bot",
        texto: `De ${tiendaMencionada.nombre} tengo ${propios.length} producto${propios.length > 1 ? "s" : ""} para mostrarte:`,
        items: propios.map(itemProducto),
      };
    }
    return {
      rol: "bot",
      texto: `${tiendaMencionada.nombre} aún no tiene productos publicados.`,
      items: [itemTienda(tiendaMencionada)],
    };
  }

  const categoriaMencionada = k.categorias.find((c) => texto.includes(normalizar(c.nombre)));
  if (categoriaMencionada && tokens.length <= 4) {
    const propios = productos.filter((p) => p.categoria === categoriaMencionada.slug).slice(0, 4);
    if (propios.length) {
      return {
        rol: "bot",
        texto: `En ${categoriaMencionada.nombre} encontré ${propios.length}:`,
        items: propios.map(itemProducto),
      };
    }
  }

  if (/(tienda|tiendas|negocio|negocios|comercios)/.test(texto) && tokens.length <= 3) {
    const lista = tiendas.slice(0, 4);
    if (lista.length) {
      return {
        rol: "bot",
        texto: `Hay ${tiendas.length} tienda${tiendas.length > 1 ? "s" : ""} en UNIKO-RD. Estas destacan:`,
        items: lista.map(itemTienda),
      };
    }
    return { rol: "bot", texto: "Todavía no hay tiendas registradas." };
  }

  if (/(servicio|servicios|profesional|profesionales|tecnico|tecnicos)/.test(texto)) {
    const lista = k.servicios.slice(0, 4);
    if (lista.length) {
      return {
        rol: "bot",
        texto: "Estos servicios están disponibles:",
        items: lista.map(itemServicio),
      };
    }
    return { rol: "bot", texto: "No hay servicios publicados todavía." };
  }

  const conPuntos = productos
    .map((p) => ({
      p,
      puntos:
        puntuar(p.titulo, tokens, 3) +
        puntuar(p.sku ?? "", tokens, 5) +
        puntuar(p.categoria, tokens, 2) +
        puntuar(p.tienda, tokens, 2) +
        puntuar(p.descripcion ?? "", tokens, 1),
    }))
    .filter((x) => x.puntos > 0)
    .sort((a, b) => b.puntos - a.puntos)
    .slice(0, 4);

  if (conPuntos.length) {
    return {
      rol: "bot",
      texto: "Esto es lo más parecido que encuentro:",
      items: conPuntos.map((x) => itemProducto(x.p)),
    };
  }

  const tiendasParecidas = tiendas
    .filter((t) => puntuar(`${t.nombre} ${t.categoria} ${t.ubicacion}`, tokens, 1) > 0)
    .slice(0, 3);
  if (tiendasParecidas.length) {
    return {
      rol: "bot",
      texto: "Encontré tiendas relacionadas:",
      items: tiendasParecidas.map(itemTienda),
    };
  }

  const categorias = k.categorias.filter((c) => puntuar(c.nombre, tokens, 1) > 0).slice(0, 4);
  if (categorias.length) {
    return {
      rol: "bot",
      texto: `No hay resultados exactos, pero mira estas categorías: ${categorias
        .map((c) => c.nombre)
        .join(", ")}.`,
    };
  }

  return {
    rol: "bot",
    texto: `No encontré “${consulta.trim()}”. Prueba con otro término, por ejemplo: “celulares”, “ofertas”, “tiendas” o “servicios”.`,
  };
}

function burbujasDeItems(items: Item[]): React.ReactNode {
  return (
    <div className="mt-2 grid gap-2">
      {items.map((it) => {
        const enlace =
          it.tipo === "producto"
            ? { to: "/productos/$productoId" as const, params: { productoId: it.id } }
            : it.tipo === "tienda"
              ? { to: "/tiendas/$tiendaId" as const, params: { tiendaId: it.id } }
              : { to: "/servicios/$servicioId" as const, params: { servicioId: it.id } };
        return (
          <Link
            key={`${it.tipo}-${it.id}`}
            {...enlace}
            className="flex items-center gap-2 rounded-xl border border-border bg-background p-2 transition hover:border-brand"
          >
            {it.imagen ? (
              <img src={it.imagen} alt="" className="h-10 w-10 rounded-lg object-cover" />
            ) : (
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-muted text-xs font-bold">
                {it.titulo.slice(0, 2)}
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-xs font-bold text-foreground">{it.titulo}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{it.detalle}</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export function Chatbot() {
  const [abierto, setAbierto] = useState(false);
  const [cfg, setCfg] = useState<ChatbotSettingsRow | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [entrada, setEntrada] = useState("");
  const [escribiendo, setEscribiendo] = useState(false);
  const finMensajes = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchConfigChatbot()
      .then((c) => {
        setCfg(c);
        setMensajes([{ rol: "bot", texto: c.greeting }]);
      })
      .catch(() => setCfg(null));
  }, []);

  useEffect(() => {
    finMensajes.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensajes, escribiendo, abierto]);

  const abrir = async () => {
    setAbierto((a) => !a);
    try {
      const actual = await fetchConfigChatbot();
      setCfg(actual);
      setMensajes([{ rol: "bot", texto: actual.greeting }]);
    } catch {
      setMensajes([{ rol: "bot", texto: "No pude conectar con el catálogo. Intenta de nuevo." }]);
    }
  };

  const enviar = async (texto: string) => {
    const consulta = texto.trim();
    if (!consulta || escribiendo) return;
    setEntrada("");
    setMensajes((prev) => [...prev, { rol: "user", texto: consulta }]);
    setEscribiendo(true);
    try {
      const k = await fetchConocimientoChatbot();
      setCfg(k.cfg);
      if (!k.cfg.enabled) {
        setAbierto(false);
        setMensajes([]);
        return;
      }
      const respuesta = responder(consulta, k.cfg, k);
      setMensajes((prev) => [...prev, respuesta]);
    } catch {
      setMensajes((prev) => [
        ...prev,
        { rol: "bot", texto: "No pude consultar el catálogo. Intenta de nuevo en unos segundos." },
      ]);
    } finally {
      setEscribiendo(false);
    }
  };

  if (cfg && !cfg.enabled) return null;

  const sugerencias = ["Ofertas", "Tiendas", "Servicios", "Productos nuevos"];

  return (
    <>
      <button
        type="button"
        onClick={() => void abrir()}
        aria-label="Abrir chat de UNIKO"
        data-testid="chatbot-fab"
        className="fixed bottom-20 lg:bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-lg transition hover:scale-105"
      >
        {abierto ? (
          <X className="h-6 w-6" />
        ) : (
          <img
            src="/uniko-logo.png"
            alt=""
            className="h-9 w-9 rounded-full bg-white object-contain p-0.5"
          />
        )}
      </button>

      {abierto && (
        <div
          data-testid="chatbot-panel"
          className="fixed bottom-36 lg:bottom-24 right-5 z-50 flex h-[65dvh] max-h-[560px] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-lg border border-border bg-card shadow-2xl"
        >
          <div className="flex items-center gap-3 border-b border-border bg-brand px-4 py-3 text-brand-foreground">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white">
              <img src="/uniko-logo.png" alt="UNIKO" className="h-7 w-7 object-contain" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">UNIKO Asistente</p>
              <p className="text-[11px] opacity-90">Respondo sobre productos y tiendas</p>
            </div>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar chat"
              className="ml-auto"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {mensajes.map((m, i) => (
              <div key={i} className={m.rol === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  data-testid={m.rol === "user" ? "msg-user" : "msg-bot"}
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    m.rol === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-foreground"
                  }`}
                >
                  {m.rol === "bot" && (
                    <span className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-brand">
                      <Bot className="h-3 w-3" /> UNIKO
                    </span>
                  )}
                  <p className="whitespace-pre-wrap">{m.texto}</p>
                  {m.items?.length ? burbujasDeItems(m.items) : null}
                </div>
              </div>
            ))}
            {escribiendo && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-background px-3 py-2 text-xs text-muted-foreground">
                  UNIKO está escribiendo…
                </div>
              </div>
            )}
            <div ref={finMensajes} />
          </div>

          {mensajes.length <= 1 && (
            <div className="flex flex-wrap gap-1.5 px-3 pb-2">
              {sugerencias.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => enviar(s)}
                  className="rounded-full border border-brand/40 bg-brand/10 px-2.5 py-1 text-[11px] font-semibold text-brand hover:bg-brand/20"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviar(entrada);
            }}
            className="flex items-center gap-2 border-t border-border p-2"
          >
            <input
              value={entrada}
              onChange={(e) => setEntrada(e.target.value)}
              placeholder="Pregunta por productos, precios…"
              className="input-uniko flex-1"
              aria-label="Mensaje"
            />
            <button
              type="submit"
              aria-label="Enviar"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand text-brand-foreground"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {!abierto && (
        <div className="pointer-events-none fixed bottom-5 right-20 z-40 hidden items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow lg:flex">
          <MessageCircle className="h-3.5 w-3.5 text-brand" /> ¿Ayudo?
        </div>
      )}
    </>
  );
}
