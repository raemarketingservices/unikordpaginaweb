// Mapas con Leaflet + OpenStreetMap (gratis, sin clave). La raíz es `ssr: false`,
// así que Leaflet (que toca `window`) solo corre en el navegador.
import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LocateFixed, MapPin } from "lucide-react";
import { toast } from "sonner";
import type { Servicio, Tienda } from "@/data/marketplace";

export type Punto = { lat: number; lng: number };
export type PuntoMapa = Punto & {
  id: string;
  nombre: string;
  tipo: "tienda" | "servicio";
  provincia: string;
  detalle: string;
};

const CENTRO_RD: L.LatLngTuple = [18.8, -70.3];
const ZOOM_RD = 7;
const COLOR = { tienda: "#cd002b", servicio: "#0b3fae", yo: "#16a34a" } as const;

function crearMapa(el: HTMLElement) {
  const mapa = L.map(el, { scrollWheelZoom: false }).setView(CENTRO_RD, ZOOM_RD);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(mapa);
  return mapa;
}

function circulo(p: Punto, color: string) {
  return L.circleMarker([p.lat, p.lng], {
    radius: 8,
    color: "#fff",
    weight: 2,
    fillColor: color,
    fillOpacity: 1,
  });
}

function miUbicacion(): Promise<Punto> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Tu dispositivo no permite ubicación."));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => reject(new Error("No pudimos obtener tu ubicación. Revisa el permiso de ubicación.")),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  });
}

function distanciaKm(a: Punto, b: Punto) {
  const r = (g: number) => (g * Math.PI) / 180;
  const h =
    Math.sin(r(b.lat - a.lat) / 2) ** 2 +
    Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** Para formularios: toca el mapa o usa tu ubicación para fijar el punto exacto. */
export function SelectorUbicacion({
  value,
  onChange,
}: {
  value: Punto | null;
  onChange: (p: Punto) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const marca = useRef<L.CircleMarker | null>(null);
  const cambio = useRef(onChange);
  cambio.current = onChange;

  useEffect(() => {
    if (!ref.current) return;
    const m = crearMapa(ref.current);
    m.on("click", (e: L.LeafletMouseEvent) => cambio.current({ lat: e.latlng.lat, lng: e.latlng.lng }));
    mapa.current = m;
    return () => {
      m.remove();
      mapa.current = null;
      marca.current = null;
    };
  }, []);

  useEffect(() => {
    const m = mapa.current;
    if (!m || !value) return;
    if (marca.current) marca.current.setLatLng([value.lat, value.lng]);
    else marca.current = circulo(value, COLOR.tienda).addTo(m);
    if (m.getZoom() < 14) m.setView([value.lat, value.lng], 16);
  }, [value]);

  return (
    <div className="grid gap-2">
      <div
        ref={ref}
        className="relative z-0 h-64 w-full overflow-hidden rounded-xl border border-border"
        role="application"
        aria-label="Mapa para elegir la ubicación"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn-base btn-outline"
          onClick={() =>
            miUbicacion()
              .then(onChange)
              .catch((e: Error) => toast.error(e.message))
          }
        >
          <LocateFixed className="h-4 w-4" /> Usar mi ubicación
        </button>
        <span className="text-xs text-muted-foreground">
          {value
            ? `Punto fijado: ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`
            : "Toca el mapa en el lugar exacto de tu negocio."}
        </span>
      </div>
    </div>
  );
}

/** Tiendas con punto + servicios con punto propio o, si no, el de su tienda. */
export function puntosMapa(tiendas: Tienda[], servicios: Servicio[]): PuntoMapa[] {
  const porId = new Map(tiendas.map((t) => [t.id, t]));
  const out: PuntoMapa[] = [];
  for (const t of tiendas)
    if (t.lat != null && t.lng != null)
      out.push({ id: t.id, nombre: t.nombre, tipo: "tienda", provincia: t.ubicacion,
        detalle: t.categoria, lat: t.lat, lng: t.lng });
  for (const s of servicios) {
    const base = s.lat != null && s.lng != null ? s : s.tiendaId ? porId.get(s.tiendaId) : undefined;
    if (base?.lat != null && base.lng != null)
      out.push({ id: s.id, nombre: s.titulo, tipo: "servicio", provincia: s.ubicacion,
        detalle: s.proveedor, lat: base.lat, lng: base.lng });
  }
  return out;
}

/** Mapa principal: todas las tiendas y servicios con punto, filtro por provincia y «cerca de mí». */
export function MapaMarketplace({ puntos }: { puntos: PuntoMapa[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const capa = useRef<L.LayerGroup | null>(null);
  const [provincia, setProvincia] = useState("");
  const [yo, setYo] = useState<Punto | null>(null);
  const [buscando, setBuscando] = useState(false);

  const provincias = useMemo(
    () => [...new Set(puntos.map((p) => p.provincia).filter(Boolean))].sort(),
    [puntos],
  );
  const visibles = useMemo(
    () => puntos.filter((p) => !provincia || p.provincia === provincia),
    [puntos, provincia],
  );
  const cercanos = useMemo(
    () =>
      yo
        ? visibles
            .map((p) => ({ ...p, km: distanciaKm(yo, p) }))
            .sort((a, b) => a.km - b.km)
            .slice(0, 6)
        : [],
    [visibles, yo],
  );

  useEffect(() => {
    if (!ref.current) return;
    const m = crearMapa(ref.current);
    mapa.current = m;
    capa.current = L.layerGroup().addTo(m);
    return () => {
      m.remove();
      mapa.current = null;
      capa.current = null;
    };
  }, []);

  useEffect(() => {
    const m = mapa.current;
    const c = capa.current;
    if (!m || !c) return;
    c.clearLayers();
    for (const p of visibles) {
      const enlace = p.tipo === "tienda" ? `/tiendas/${p.id}` : `/servicios/${p.id}`;
      const popup = document.createElement("div");
      const titulo = document.createElement("a");
      titulo.href = enlace;
      titulo.textContent = p.nombre;
      titulo.style.fontWeight = "700";
      const sub = document.createElement("div");
      sub.textContent = [p.tipo === "tienda" ? "Tienda" : "Servicio", p.detalle, p.provincia]
        .filter(Boolean)
        .join(" · ");
      popup.append(titulo, sub);
      circulo(p, COLOR[p.tipo]).bindPopup(popup).addTo(c);
    }
    if (yo) circulo(yo, COLOR.yo).bindPopup("Estás aquí").addTo(c);
    const todos: L.LatLngTuple[] = [
      ...(yo ? cercanos.slice(0, 3) : visibles).map((p): L.LatLngTuple => [p.lat, p.lng]),
      ...(yo ? [[yo.lat, yo.lng] as L.LatLngTuple] : []),
    ];
    if (todos.length > 1) m.fitBounds(todos, { padding: [30, 30], maxZoom: 15 });
    else if (todos[0]) m.setView(todos[0], 14);
    else m.setView(CENTRO_RD, ZOOM_RD);
  }, [visibles, yo, cercanos]);

  const buscarCerca = () => {
    setBuscando(true);
    miUbicacion()
      .then(setYo)
      .catch((e: Error) => toast.error(e.message))
      .finally(() => setBuscando(false));
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary">
            <MapPin className="h-4 w-4" /> Mapa de República Dominicana
          </p>
          <h2 className="mt-1 text-2xl">Tiendas cerca de mí</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {puntos.length} tiendas y servicios con ubicación en el mapa.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            aria-label="Filtrar por provincia"
            className="select-uniko"
            value={provincia}
            onChange={(e) => setProvincia(e.target.value)}
          >
            <option value="">Todas las provincias</option>
            {provincias.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <button type="button" className="btn-base btn-brand" onClick={buscarCerca} disabled={buscando}>
            <LocateFixed className="h-4 w-4" /> {buscando ? "Buscando…" : "Tiendas cerca de mí"}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_300px]">
        <div
          ref={ref}
          className="card-uniko relative z-0 h-[420px] w-full overflow-hidden"
          role="application"
          aria-label="Mapa de tiendas y servicios"
        />
        <div className="card-uniko p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-primary">
            {yo ? "Más cercanas a ti" : "Cómo usarlo"}
          </p>
          {yo ? (
            <ul className="mt-3 grid gap-2">
              {cercanos.map((p) => (
                <li key={`${p.tipo}-${p.id}`}>
                  <a
                    href={p.tipo === "tienda" ? `/tiendas/${p.id}` : `/servicios/${p.id}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border p-2 text-sm hover:bg-muted/40"
                  >
                    <span className="min-w-0 truncate font-semibold">{p.nombre}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {p.km < 1 ? `${Math.round(p.km * 1000)} m` : `${p.km.toFixed(1)} km`}
                    </span>
                  </a>
                </li>
              ))}
              {!cercanos.length && (
                <li className="text-sm text-muted-foreground">No hay tiendas en esta provincia.</li>
              )}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Pulsa «Tiendas cerca de mí» para ver las más cercanas, o toca un punto del mapa para ver
              la tienda. Rojo: tiendas · Azul: servicios.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
