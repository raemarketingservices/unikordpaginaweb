import { supabase } from "./supabase";
import { DATA_SOURCE } from "./data-source";

/**
 * El chat solo existe contra Supabase: en modo catálogo local no hay sesión ni servidor,
 * y el worker de Cloudflare que usaba la pantalla anterior ya no existe.
 */
export const CHAT_ACTIVO = DATA_SOURCE === "supabase";

export type TipoConversacion = "cliente_tienda" | "tienda_tienda";

export type Conversacion = {
  id: string;
  tipo: TipoConversacion;
  store_id: string;
  partner_store_id: string | null;
  cliente_id: string | null;
  ultimo_mensaje: string | null;
  ultimo_mensaje_at: string | null;
  ultimo_autor_id: string | null;
  created_at: string;
};

export type Mensaje = {
  id: string;
  conversation_id: string;
  autor_id: string;
  cuerpo: string;
  created_at: string;
};

/** Una conversación ya resuelta contra las tiendas, lista para pintar en el list lateral. */
export type ConversacionView = Conversacion & {
  /** Nombre de a quién le hablo, desde mi punto de vista. */
  contraparte: string;
  logo: string | null;
  no_leidos: boolean;
};

type LecturaRow = { conversation_id: string; leido_hasta: string };

function fallo(message: string): never {
  throw new Error(message);
}

const LIMITE_HILO = 200;

// --- Listados ---------------------------------------------------------

export async function fetchConversaciones(miId: string): Promise<ConversacionView[]> {
  if (!CHAT_ACTIVO) return [];
  const [convs, lecturas, tiendas] = await Promise.all([
    supabase
      .from("conversations")
      .select("*")
      .order("ultimo_mensaje_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
    // La política de `conversation_reads` solo deja ver las filas propias, así que esta
    // consulta no puede filtrar la marca de lectura de otra persona.
    supabase
      .from("conversation_reads")
      .select("conversation_id,leido_hasta")
      .eq("profile_id", miId),
    fetchTiendasDeChat(miId),
  ]);
  if (convs.error) fallo(convs.error.message);
  if (lecturas.error) fallo(lecturas.error.message);

  const leido = new Map<string, string>(
    ((lecturas.data ?? []) as LecturaRow[]).map((l) => [l.conversation_id, l.leido_hasta]),
  );

  return ((convs.data ?? []) as Conversacion[]).map((c) => {
    const hasta = leido.get(c.id);
    const otra =
      c.tipo === "tienda_tienda" ? laOtraTienda(c, miId, tiendas) : tiendaDe(tiendas, c.store_id);
    // En un hilo de cliente, desde la tienda el otro lado no tiene nombre público: `profiles`
    // solo es legible por el propio usuario y por el admin, así que no se puede resolver.
    const esMiHiloDeCliente = c.tipo === "cliente_tienda" && c.cliente_id !== miId;
    return {
      ...c,
      contraparte: esMiHiloDeCliente ? "Cliente" : (otra?.nombre ?? "Conversación"),
      logo: esMiHiloDeCliente ? null : (otra?.logo ?? null),
      no_leidos: Boolean(
        c.ultimo_mensaje_at &&
        c.ultimo_autor_id !== miId &&
        (!hasta || c.ultimo_mensaje_at > hasta),
      ),
    };
  });
}

export type TiendaChat = { id: string; nombre: string; logo: string | null; esMia: boolean };

export async function fetchTiendasDeChat(miId: string): Promise<TiendaChat[]> {
  if (!CHAT_ACTIVO) return [];
  const { data, error } = await supabase
    .from("stores")
    .select("id,name,logo,owner_id")
    .eq("approved", true)
    .order("name");
  if (error) fallo(error.message);
  return (
    (data ?? []) as { id: string; name: string; logo: string | null; owner_id: string | null }[]
  ).map((s) => ({ id: s.id, nombre: s.name, logo: s.logo, esMia: s.owner_id === miId }));
}

function tiendaDe(tiendas: TiendaChat[], id: string | null): TiendaChat | undefined {
  return id ? tiendas.find((t) => t.id === id) : undefined;
}

/**
 * En un hilo tienda a tienda, las dos partes son mías o una de ellas lo es. Se devuelve la
 * que NO es mía; si por algún motivo ninguna lo es (se le retiró un dueño a la tienda),
 * se muestra la que no encabeza la fila para que el título no se repita con el remite.
 */
function laOtraTienda(
  c: Conversacion,
  miId: string,
  tiendas: TiendaChat[],
): TiendaChat | undefined {
  const cabecera = tiendaDe(tiendas, c.store_id);
  const pareja = tiendaDe(tiendas, c.partner_store_id);
  if (cabecera?.esMia) return pareja ?? cabecera;
  return cabecera ?? pareja;
}

export async function fetchHilo(conversationId: string): Promise<Mensaje[]> {
  if (!CHAT_ACTIVO) return [];
  const { data, error } = await supabase
    .from("conversation_messages")
    .select("id,conversation_id,autor_id,cuerpo,created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(LIMITE_HILO);
  if (error) fallo(error.message);
  return ((data ?? []) as Mensaje[]).reverse();
}

// --- Acciones ---------------------------------------------------------

/**
 * Crea el hilo o devuelve el que ya había. Toda la autoridad está en
 * `iniciar_conversacion()`: la tienda tiene que estar aprobada y, en un hilo de tienda a
 * tienda, quien llama tiene que ser dueño de una de las dos.
 */
export async function abrirConversacion(storeId: string, partnerStoreId?: string): Promise<string> {
  if (!CHAT_ACTIVO) fallo("El chat no está disponible en este modo.");
  const { data, error } = await supabase.rpc("iniciar_conversacion", {
    p_store_id: storeId,
    p_partner_store_id: partnerStoreId ?? null,
  });
  if (error) fallo(traducir(error.message));
  if (typeof data !== "string") fallo("No se pudo abrir la conversación.");
  return data;
}

export async function enviarMensaje(
  conversationId: string,
  cuerpo: string,
  miId: string,
): Promise<void> {
  if (!CHAT_ACTIVO) fallo("El chat no está disponible en este modo.");
  const limpio = cuerpo.trim();
  if (!limpio) return;
  const { error } = await supabase.from("conversation_messages").insert({
    conversation_id: conversationId,
    autor_id: miId,
    cuerpo: limpio.slice(0, 4000),
  });
  if (error) fallo(traducir(error.message));
}

export async function marcarLeida(conversationId: string): Promise<void> {
  if (!CHAT_ACTIVO) return;
  // Sin esperar respuesta: es un detalle de comodidad y un fallo aquí no debe tapar el hilo.
  void supabase.rpc("marcar_conversacion_leida", { p_conversation_id: conversationId });
}

// --- Tiempo real ------------------------------------------------------

/**
 * El Realtime del homelab filtra el WAL por RLS, pero nunca se usa para llevar contenido:
 * solo avisa de que algo cambió y entonces se recarga por REST. Así la única vía por la
 * que entra texto al hilo es una consulta con sus políticas evaluadas, y si el socket se
 * cae —que en iOS en segundo plano se cae— el `setInterval` de respaldo lo tapa.
 */
export function suscribirCambios(conversationId: string | null, onChange: () => void): () => void {
  if (!CHAT_ACTIVO) return () => {};
  const canal = supabase
    .channel(`uniko-chat-${conversationId ?? "listado"}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, onChange)
    .on(
      "postgres_changes",
      conversationId
        ? {
            event: "INSERT",
            schema: "public",
            table: "conversation_messages",
            filter: `conversation_id=eq.${conversationId}`,
          }
        : { event: "INSERT", schema: "public", table: "conversation_messages" },
      onChange,
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(canal);
  };
}

const TRADUCCIONES: [RegExp, string][] = [
  [/sesion_requerida/i, "Inicia sesión para chatear."],
  [/tienda_no_disponible/i, "Esa tienda todavía no está disponible."],
  [/sin_tienda_propia/i, "Necesitas una tienda aprobada para escribir a otra tienda."],
  [/tienda_duplicada/i, "No puedes escribirte a ti mismo."],
  [/sin_acceso/i, "No tienes acceso a esta conversación."],
  [/row-level security/i, "No tienes acceso a esta conversación."],
];

function traducir(mensaje: string): string {
  const hallada = TRADUCCIONES.find(([r]) => r.test(mensaje));
  return hallada ? hallada[1] : mensaje;
}
