import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Car, Package, Navigation } from 'lucide-react';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Ubicacion {
  lat: number;
  lng: number;
  label?: string;
}

interface MapaTrackingProps {
  tipo: 'vehiculo' | 'delivery';
  origen?: Ubicacion;
  destino?: Ubicacion;
  actual?: Ubicacion;
  onUbicacionSeleccionada?: (lat: number, lng: number) => void;
  seleccionable?: boolean;
  altura?: string;
}

export function MapaTracking({
  tipo,
  origen,
  destino,
  actual,
  onUbicacionSeleccionada,
  seleccionable = false,
  altura = '400px',
}: MapaTrackingProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [direccion, setDireccion] = useState<string>('');

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Centro por defecto: Santo Domingo
    const centroRD: [number, number] = [18.4861, -69.9312];

    const map = L.map(containerRef.current, {
      center: actual ? [actual.lat, actual.lng] : origen ? [origen.lat, origen.lng] : centroRD,
      zoom: actual || origen || destino ? 14 : 9,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    mapRef.current = map;

    // Si es seleccionable, permitir hacer clic en el mapa
    if (seleccionable && onUbicacionSeleccionada) {
      map.on('click', async (e) => {
        const { lat, lng } = e.latlng;
        onUbicacionSeleccionada(lat, lng);

        // Geocodificación inversa para obtener dirección
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const data = await response.json();
          setDireccion(data.display_name);
        } catch (error) {
          console.error('Error al obtener dirección:', error);
        }

        // Limpiar marcadores previos
        map.eachLayer((layer) => {
          if (layer instanceof L.Marker) {
            map.removeLayer(layer);
          }
        });

        // Agregar nuevo marcador
        L.marker([lat, lng])
          .addTo(map)
          .bindPopup(direccion || `${lat.toFixed(5)}, ${lng.toFixed(5)}`)
          .openPopup();
      });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Actualizar marcadores cuando cambian las ubicaciones
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    // Limpiar marcadores existentes
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    const bounds: L.LatLngBoundsExpression = [];

    // Marcador de origen
    if (origen) {
      const origenIcon = L.divIcon({
        html: `<div class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg">
          <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
        </div>`,
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
      });

      L.marker([origen.lat, origen.lng], { icon: origenIcon })
        .addTo(map)
        .bindPopup(`<b>Origen</b><br>${origen.label || 'Punto de partida'}`);
      bounds.push([origen.lat, origen.lng]);
    }

    // Marcador de destino
    if (destino) {
      const destinoIcon = L.divIcon({
        html: `<div class="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white shadow-lg">
          <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
        </div>`,
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
      });

      L.marker([destino.lat, destino.lng], { icon: destinoIcon })
        .addTo(map)
        .bindPopup(`<b>Destino</b><br>${destino.label || 'Punto de llegada'}`);
      bounds.push([destino.lat, destino.lng]);
    }

    // Marcador de ubicación actual (vehículo/repartidor en movimiento)
    if (actual) {
      const actualIcon = L.divIcon({
        html: tipo === 'vehiculo'
          ? `<div class="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-white shadow-lg animate-pulse">
              <svg class="h-7 w-7" fill="currentColor" viewBox="0 0 24 24"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>
            </div>`
          : `<div class="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg animate-pulse">
              <svg class="h-7 w-7" fill="currentColor" viewBox="0 0 24 24"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
            </div>`,
        className: '',
        iconSize: [48, 48],
        iconAnchor: [24, 48],
      });

      L.marker([actual.lat, actual.lng], { icon: actualIcon })
        .addTo(map)
        .bindPopup(`<b>${tipo === 'vehiculo' ? 'Vehículo' : 'Repartidor'}</b><br>${actual.label || 'En camino'}`);
      bounds.push([actual.lat, actual.lng]);
    }

    // Dibujar ruta si hay origen y destino
    if (origen && destino) {
      L.polyline(
        [
          [origen.lat, origen.lng],
          [destino.lat, destino.lng],
        ],
        {
          color: tipo === 'vehiculo' ? '#ef4444' : '#f97316',
          weight: 4,
          opacity: 0.7,
          dashArray: '10, 10',
        }
      ).addTo(map);
    }

    // Ajustar vista a todos los marcadores
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [origen, destino, actual, tipo]);

  return (
    <div className="relative">
      <div ref={containerRef} style={{ height: altura, width: '100%' }} className="rounded-2xl overflow-hidden border-2 border-border" />
      {seleccionable && (
        <div className="mt-3 rounded-xl bg-blue-50 p-3 text-sm text-blue-900">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span className="font-semibold">Haz clic en el mapa para seleccionar ubicación</span>
          </div>
          {direccion && (
            <p className="mt-2 text-xs">{direccion}</p>
          )}
        </div>
      )}
    </div>
  );
}
