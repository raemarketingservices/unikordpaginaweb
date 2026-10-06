import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Package, Phone, User, Clock, MapPin, Check, Truck } from 'lucide-react';
import { MapaTracking } from '@/components/uniko/MapaTracking';
import type { DeliveryRow } from '@/lib/types';

export const Route = createFileRoute('/delivery/$id')({
  component: DeliveryTrackingPage,
});

function DeliveryTrackingPage() {
  const { id } = Route.useParams();
  const [delivery, setDelivery] = useState<DeliveryRow | null>(null);

  // Simular datos de delivery en tiempo real
  useEffect(() => {
    // En producción, esto vendría de Cloudflare D1 y se actualizaría vía SSE o polling
    const deliveryEjemplo: DeliveryRow = {
      id,
      pedido_id: 'PED-' + id,
      tienda_id: 'tienda-1',
      repartidor_id: 'rep-1',
      estado: 'en_camino',
      ubicacion_origen: {
        lat: 18.4861,
        lng: -69.9312,
        direccion: 'Tienda Digital Store, Av. Winston Churchill, Santo Domingo',
      },
      ubicacion_destino: {
        lat: 18.4734,
        lng: -69.8933,
        direccion: 'Calle El Vergel #25, Piantini, Santo Domingo',
      },
      ubicacion_actual: {
        lat: 18.4800,
        lng: -69.9100,
        timestamp: new Date().toISOString(),
      },
      tiempo_estimado: 15,
      distancia: 2500,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setDelivery(deliveryEjemplo);

    // Simular actualización de ubicación cada 5 segundos
    const interval = setInterval(() => {
      setDelivery((prev) => {
        if (!prev || prev.estado === 'entregado') return prev;

        // Mover el repartidor un poco hacia el destino
        const latDiff = prev.ubicacion_destino.lat - (prev.ubicacion_actual?.lat || prev.ubicacion_origen.lat);
        const lngDiff = prev.ubicacion_destino.lng - (prev.ubicacion_actual?.lng || prev.ubicacion_origen.lng);

        const newLat = (prev.ubicacion_actual?.lat || prev.ubicacion_origen.lat) + latDiff * 0.1;
        const newLng = (prev.ubicacion_actual?.lng || prev.ubicacion_origen.lng) + lngDiff * 0.1;

        return {
          ...prev,
          ubicacion_actual: {
            lat: newLat,
            lng: newLng,
            timestamp: new Date().toISOString(),
          },
          tiempo_estimado: Math.max(1, (prev.tiempo_estimado || 15) - 1),
          distancia: Math.max(100, (prev.distancia || 2500) - 200),
        };
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [id]);

  if (!delivery) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <Truck className="mx-auto h-16 w-16 animate-pulse text-primary" />
            <p className="mt-4 text-lg font-semibold">Cargando información del delivery...</p>
          </div>
        </div>
      </div>
    );
  }

  const estadoInfo = {
    preparando: {
      label: 'Preparando tu pedido',
      color: 'bg-blue-500',
      icon: Package,
    },
    en_camino: {
      label: 'En camino',
      color: 'bg-orange-500',
      icon: Truck,
    },
    cerca: {
      label: 'Llegando pronto',
      color: 'bg-yellow-500',
      icon: MapPin,
    },
    entregado: {
      label: 'Entregado',
      color: 'bg-green-500',
      icon: Check,
    },
    cancelado: {
      label: 'Cancelado',
      color: 'bg-red-500',
      icon: Package,
    },
  };

  const estadoActual = estadoInfo[delivery.estado];
  const IconoEstado = estadoActual.icon;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header del tracking */}
        <div className="rounded-2xl bg-gradient-to-br from-primary to-brand p-8 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm opacity-90">Pedido #{delivery.pedido_id}</p>
              <h1 className="mt-2 text-3xl font-bold">Rastreo en Tiempo Real</h1>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 backdrop-blur-sm">
                <IconoEstado className="h-5 w-5" />
                <span className="font-bold">{estadoActual.label}</span>
              </div>
            </div>
            {delivery.tiempo_estimado && delivery.estado !== 'entregado' && (
              <div className="rounded-2xl bg-white/20 p-4 text-center backdrop-blur-sm">
                <Clock className="mx-auto h-8 w-8" />
                <p className="mt-2 text-3xl font-bold">{delivery.tiempo_estimado}</p>
                <p className="text-sm opacity-90">minutos</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_400px]">
          {/* Mapa en tiempo real */}
          <div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-xl font-bold mb-4">Ubicación del Repartidor</h2>
              <MapaTracking
                tipo="delivery"
                origen={delivery.ubicacion_origen}
                destino={delivery.ubicacion_destino}
                actual={delivery.ubicacion_actual}
                altura="500px"
              />

              {/* Línea de tiempo */}
              <div className="mt-8">
                <h3 className="font-bold mb-4">Estado del Pedido</h3>
                <div className="space-y-4">
                  {[
                    { key: 'preparando', label: 'Preparando pedido', completado: true },
                    {
                      key: 'en_camino',
                      label: 'En camino',
                      completado: ['en_camino', 'cerca', 'entregado'].includes(delivery.estado),
                    },
                    {
                      key: 'cerca',
                      label: 'Cerca de tu ubicación',
                      completado: ['cerca', 'entregado'].includes(delivery.estado),
                    },
                    { key: 'entregado', label: 'Entregado', completado: delivery.estado === 'entregado' },
                  ].map((paso, idx) => (
                    <div key={paso.key} className="flex items-start gap-4">
                      <div className="relative">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full ${
                            paso.completado ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {paso.completado ? (
                            <Check className="h-5 w-5" />
                          ) : (
                            <span className="font-bold">{idx + 1}</span>
                          )}
                        </div>
                        {idx < 3 && (
                          <div
                            className={`absolute left-1/2 top-10 h-12 w-0.5 -translate-x-1/2 ${
                              paso.completado ? 'bg-green-500' : 'bg-border'
                            }`}
                          />
                        )}
                      </div>
                      <div className="flex-1 pt-2">
                        <p className={`font-semibold ${paso.completado ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {paso.label}
                        </p>
                        {paso.completado && paso.key === delivery.estado && (
                          <p className="text-sm text-green-600">Ahora</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Información del delivery */}
          <div className="space-y-6">
            {/* Info del repartidor */}
            {delivery.repartidor_id && (
              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="font-bold mb-4">Tu Repartidor</h3>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-brand flex items-center justify-center text-white text-xl font-bold">
                    <User className="h-8 w-8" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold">Juan Pérez</p>
                    <p className="text-sm text-muted-foreground">Motorizado</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex items-center gap-1 text-yellow-500">
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-sm font-semibold">5.0</span>
                    </div>
                  </div>
                </div>
                <button className="mt-4 w-full rounded-xl bg-green-600 py-3 font-bold text-white hover:bg-green-700 flex items-center justify-center gap-2">
                  <Phone className="h-5 w-5" />
                  Llamar al repartidor
                </button>
              </div>
            )}

            {/* Direcciones */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-bold mb-4">Direcciones</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-1">Origen</p>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-5 w-5 shrink-0 text-blue-500" />
                    <p className="text-sm">{delivery.ubicacion_origen.direccion}</p>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <p className="text-sm font-semibold text-muted-foreground mb-1">Destino</p>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-5 w-5 shrink-0 text-green-500" />
                    <p className="text-sm">{delivery.ubicacion_destino.direccion}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Distancia */}
            {delivery.distancia && (
              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="font-bold mb-4">Información del Viaje</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Distancia restante</span>
                    <span className="font-bold">{(delivery.distancia / 1000).toFixed(1)} km</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Tiempo estimado</span>
                    <span className="font-bold">{delivery.tiempo_estimado} min</span>
                  </div>
                </div>
              </div>
            )}

            {/* Ayuda */}
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
              <h3 className="font-bold text-blue-900 mb-2">¿Necesitas ayuda?</h3>
              <p className="text-sm text-blue-700 mb-4">
                Si tienes algún problema con tu entrega, contáctanos.
              </p>
              <button className="w-full rounded-xl border-2 border-blue-600 py-2 font-bold text-blue-600 hover:bg-blue-600 hover:text-white transition-colors">
                Contactar Soporte
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
