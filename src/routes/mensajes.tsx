import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  CHAT_ACTIVO,
  abrirConversacion,
  enviarMensaje,
  fetchConversaciones,
  fetchHilo,
  fetchTiendasDeChat,
  marcarLeida,
  suscribirCambios,
  type ConversacionView,
  type Mensaje,
  type TiendaChat,
} from "@/lib/chat";

type Busqueda = { tienda?: string | undefined; c?: string | undefined };

export const Route = createFileRoute("/mensajes")({
  validateSearch: (s): Busqueda => ({
    tienda: typeof s["tienda"] === "string" ? s["tienda"] : undefined,
    c: typeof s["c"] === "string" ? s["c"] : undefined,
  }),
  head: () => ({
    meta: [{ title: "Mensajes · UNIKO-RD" }, { name: "robots", content: "noindex" }],
  }),
  component: Mensajes,
});

/**
 * Sin mensajes en tiempo real por websocket: el Realtime solo avisa de que algo cambió y
 * entonces se recarga por REST, que es donde el RLS decide qué ve cada cual. El
 * `setInterval` es el respaldo, porque en iOS en segundo plano el socket se cae en silencio.
 */
const RESPALDO_MS = 20_000;

function Mensajes() {
  const { tienda: tiendaInicial, c: conversationInicial } = Route.useSearch();
  const { profile, loading } = useAuth();
  const [conversaciones, setConversaciones] = useState<ConversacionView[]>([]);
  const [tiendas, setTiendas] = useState<TiendaChat[]>([]);
  const [activa, setActiva] = useState<string | null>(conversationInicial ?? null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [borrador, setBorrador] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [escribiendoComo, setEscribiendoComo] = useState<string>("");
  const [nuevaTienda, setNuevaTienda] = useState<string>(tiendaInicial ?? "");

  const miId = profile?.id;
  const cargando = useRef(false);

  const misTiendas = useMemo(() => tiendas.filter((t) => t.esMia), [tiendas]);
  // Una tienda no se escribe a sí misma.
  const tiendasDestino = useMemo(() => tiendas.filter((t) => !t.esMia), [tiendas]);

  async function recargar() {
    if (!miId || cargando.current) return;
    cargando.current = true;
    try {
      const [convs, tds] = await Promise.all([fetchConversaciones(miId), fetchTiendasDeChat(miId)]);
      setConversaciones(convs);
      setTiendas(tds);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar las conversaciones.");
    } finally {
      cargando.current = false;
    }
  }

  async function recargarHilo(id: string | null) {
    if (!id) {
      setMensajes([]);
      return;
    }
    try {
      setMensajes(await fetchHilo(id));
      void marcarLeida(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los mensajes.");
    }
  }

  useEffect(() => {
    if (!miId) return;
    void recargar();
    const alto = suscribirCambios(null, () => void recargar());
    const timer = setInterval(() => void recargar(), RESPALDO_MS);
    return () => {
      alto();
      clearInterval(timer);
    };
    // `recargar` se lee a sí misma vía refs; dependemos solo de la sesión.
  }, [miId]);

  useEffect(() => {
    if (!activa) return;
    void recargarHilo(activa);
    const alto = suscribirCambios(activa, () => void recargarHilo(activa));
    return alto;
  }, [activa]);

  const fondo = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const n = fondo.current;
    if (n) n.scrollTop = n.scrollHeight;
  }, [mensajes]);

  // Quien llega desde la ficha de una tienda con `?tienda=` no debería verse con un hilo
  // nuevo si ya habló con esa tienda: se abre el que existe. Una sola vez por tienda, para
  // no deshacer el "Nueva conversación" cuando el usuario lo pule.
  const preseleccion = useRef<string | null>(null);
  useEffect(() => {
    if (!miId || !tiendaInicial || conversaciones.length === 0) return;
    if (preseleccion.current === tiendaInicial) return;
    preseleccion.current = tiendaInicial;
    const existente = conversaciones.find(
      (c) => c.store_id === tiendaInicial || c.partner_store_id === tiendaInicial,
    );
    if (existente) setActiva(existente.id);
  }, [miId, tiendaInicial, conversaciones]);

  if (loading) return <p className="p-8">Cargando…</p>;

  if (!profile) {
    return (
      <div className="mx-auto max-w-xl p-8">
        <h1 className="text-2xl">Contacta con las tiendas</h1>
        <p className="my-4">
          Inicia sesión para enviar mensajes a una tienda, y para que otras tiendas puedan
          escribirte desde la suya.
        </p>
        <Link className="btn-base btn-primary" to="/auth" search={{ redirect: "/mensajes" }}>
          Iniciar sesión o crear cuenta
        </Link>
      </div>
    );
  }

  if (!CHAT_ACTIVO) {
    return (
      <div className="mx-auto max-w-xl p-8">
        <h1 className="text-2xl">Mensajes</h1>
        <p className="mt-2 text-muted-foreground">
          El chat está desactivado en este modo de datos: no hay un backend que lo sostenga.
        </p>
      </div>
    );
  }

  const seleccion = conversaciones.find((c) => c.id === activa) ?? null;
  const escribiendoDesde = misTiendas.find((t) => t.id === escribiendoComo) ?? null;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const cuerpo = borrador.trim();
    if (!cuerpo || enviando || !miId) return;
    setEnviando(true);
    setError("");
    try {
      let id = activa;
      if (!id) {
        if (!nuevaTienda) return;
        id = await abrirConversacion(
          escribiendoDesde ? escribiendoDesde.id : nuevaTienda,
          escribiendoDesde ? nuevaTienda : undefined,
        );
        setActiva(id);
      }
      await enviarMensaje(id, cuerpo, miId);
      setBorrador("");
      await Promise.all([recargarHilo(id), recargar()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar el mensaje.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl">Mensajes</h1>
      <p className="mt-2 text-muted-foreground">
        Conversaciones entre clientes y tiendas, y entre tiendas del marketplace.
      </p>
      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <section className="card-uniko space-y-2 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-bold">Conversaciones</h2>
              {activa && (
                <button
                  type="button"
                  className="text-xs font-semibold text-brand underline-offset-2 hover:underline"
                  onClick={() => {
                    setActiva(null);
                    setBorrador("");
                  }}
                >
                  Nueva
                </button>
              )}
            </div>
            {conversaciones.length === 0 && (
              <p className="text-sm text-muted-foreground">Todavía no tienes conversaciones.</p>
            )}
            <ul className="space-y-1">
              {conversaciones.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setActiva(c.id)}
                    aria-current={c.id === activa}
                    className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${
                      c.id === activa ? "border-brand bg-brand/5" : "hover:bg-muted"
                    }`}
                  >
                    {c.logo ? (
                      <img
                        src={c.logo}
                        alt=""
                        className="h-8 w-8 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-xs font-bold">
                        {c.contraparte.slice(0, 1)}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-semibold">{c.contraparte}</span>
                        {c.no_leidos && (
                          <span
                            className="h-2 w-2 shrink-0 rounded-full bg-brand"
                            aria-label="sin leer"
                          />
                        )}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {c.ultimo_mensaje ??
                          (c.tipo === "tienda_tienda" ? "Entre tiendas" : "Consulta nueva")}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {!activa && (
            <section className="card-uniko space-y-3 p-4">
              <h2 className="font-bold">Empezar una conversación</h2>
              {misTiendas.length > 0 && (
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Escribir desde</span>
                  <select
                    className="select-uniko w-full"
                    value={escribiendoComo}
                    onChange={(e) => setEscribiendoComo(e.target.value)}
                  >
                    <option value="">Mi cuenta de cliente</option>
                    {misTiendas.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="grid gap-2">
                <span className="text-sm font-semibold">
                  {escribiendoComo ? "Tienda destinataria" : "Contactar una tienda"}
                </span>
                <select
                  className="select-uniko w-full"
                  value={nuevaTienda}
                  onChange={(e) => setNuevaTienda(e.target.value)}
                >
                  <option value="">Selecciona una tienda</option>
                  {tiendasDestino.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </label>
              {escribiendoComo && misTiendas.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Los mensajes entre tiendas los lee el dueño de la tienda destinataria.
                </p>
              )}
            </section>
          )}
        </aside>

        <section className="card-uniko flex min-h-[520px] flex-col p-5">
          <header className="flex items-center justify-between gap-3">
            <h2 className="text-xl">
              {seleccion
                ? seleccion.contraparte
                : (tiendas.find((t) => t.id === nuevaTienda)?.nombre ?? "Selecciona una tienda")}
            </h2>
            {seleccion?.tipo === "tienda_tienda" && (
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                Entre tiendas
              </span>
            )}
          </header>

          <div ref={fondo} aria-live="polite" className="my-5 flex-1 space-y-3 overflow-y-auto">
            {mensajes.map((m) => {
              const mio = m.autor_id === miId;
              return (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-xl p-3 ${mio ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"}`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.cuerpo}</p>
                  <time className="block text-xs opacity-70">
                    {new Date(m.created_at).toLocaleString("es-DO")}
                  </time>
                </div>
              );
            })}
            {mensajes.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Escribe tu consulta sobre productos, disponibilidad o entrega.
              </p>
            )}
          </div>

          <form className="flex gap-3" onSubmit={enviar}>
            <textarea
              aria-label="Mensaje"
              required
              maxLength={4000}
              className="input-uniko flex-1"
              value={borrador}
              onChange={(e) => setBorrador(e.target.value)}
              placeholder="Escribe tu mensaje…"
              rows={2}
            />
            <button
              className="btn-base btn-primary"
              disabled={!borrador.trim() || enviando || (!seleccion && !nuevaTienda)}
            >
              {enviando ? "Enviando…" : "Enviar"}
            </button>
          </form>
          {!seleccion && !nuevaTienda && (
            <p className="mt-2 text-xs text-muted-foreground">
              El primer mensaje abre la conversación; si ya existía, se continúa la misma.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
