import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Car, MapPin, Users, Briefcase, Fuel, Settings, Calendar, ChevronLeft, Check, Star } from 'lucide-react';
import { MapaTracking } from '@/components/uniko/MapaTracking';

export const Route = createFileRoute('/vehiculos/$id')({
  component: VehiculoDetallePage,
});

function VehiculoDetallePage() {
  const { id } = Route.useParams();
  const [imagenActual, setImagenActual] = useState(0);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [mostrarMapa, setMostrarMapa] = useState(false);

  // Datos de ejemplo
  const vehiculo = {
    id,
    nombre: 'Toyota Corolla 2023',
    marca: 'Toyota',
    modelo: 'Corolla',
    año: 2023,
    precio_dia: 1500,
    imagenes: [
      'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800',
      'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800',
      'https://images.unsplash.com/photo-1627454820516-34cb85e39d1e?w=800',
    ],
    ubicacion: {
      lat: 18.4861,
      lng: -69.9312,
      direccion: 'Av. Winston Churchill, Santo Domingo, DN',
    },
    tienda: {
      nombre: 'RentaCar Express',
      logo: 'https://api.dicebear.com/7.x/initials/svg?seed=RentaCar',
      rating: 4.8,
      rentas: 245,
    },
    caracteristicas: {
      transmision: 'Automática',
      combustible: 'Gasolina',
      pasajeros: 5,
      maletas: 2,
      puertas: 4,
      aire_acondicionado: true,
    },
    incluye: [
      'Seguro básico',
      'Kilometraje ilimitado',
      'Asistencia 24/7',
      'GPS incluido',
      'Entrega a domicilio',
    ],
    descripcion:
      'Toyota Corolla 2023 en excelente condición. Perfecto para viajes de negocios o familiares. Vehículo económico y confiable con todas las comodidades.',
  };

  const calcularDias = () => {
    if (!fechaInicio || !fechaFin) return 0;
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const dias = Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
    return dias > 0 ? dias : 0;
  };

  const dias = calcularDias();
  const total = dias * vehiculo.precio_dia;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Breadcrumb */}
        <Link
          to="/vehiculos"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver a vehículos
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_400px]">
          {/* Contenido principal */}
          <div>
            {/* Galería de imágenes */}
            <div className="space-y-4">
              <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-muted">
                <img
                  src={vehiculo.imagenes[imagenActual]}
                  alt={vehiculo.nombre}
                  className="h-full w-full object-cover"
                />
                <div className="absolute right-3 top-3 rounded-full bg-green-500 px-4 py-2 text-sm font-bold text-white shadow-lg">
                  Disponible Ahora
                </div>
              </div>

              {/* Miniaturas */}
              <div className="grid grid-cols-3 gap-3">
                {vehiculo.imagenes.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setImagenActual(idx)}
                    className={`relative aspect-video overflow-hidden rounded-xl border-2 transition-all ${
                      imagenActual === idx ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`Vista ${idx + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Info del vehículo */}
            <div className="mt-8">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold">{vehiculo.nombre}</h1>
                  <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {vehiculo.ubicacion.direccion}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-primary">
                    RD$ {vehiculo.precio_dia.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">por día</p>
                </div>
              </div>

              {/* Info de la tienda */}
              <div className="mt-6 flex items-center gap-4 rounded-xl border border-border bg-card p-4">
                <img
                  src={vehiculo.tienda.logo}
                  alt={vehiculo.tienda.nombre}
                  className="h-12 w-12 rounded-full"
                />
                <div className="flex-1">
                  <h3 className="font-bold">{vehiculo.tienda.nombre}</h3>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      {vehiculo.tienda.rating}
                    </span>
                    <span>·</span>
                    <span>{vehiculo.tienda.rentas} rentas</span>
                  </div>
                </div>
                <Link
                  to="/tiendas/$id"
                  params={{ id: 'rent-a-car-1' }}
                  className="rounded-xl border border-primary px-4 py-2 text-sm font-bold text-primary hover:bg-primary/10"
                >
                  Ver Tienda
                </Link>
              </div>

              {/* Características */}
              <div className="mt-8">
                <h2 className="text-xl font-bold">Características</h2>
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                    <Users className="h-6 w-6 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Pasajeros</p>
                      <p className="font-bold">{vehiculo.caracteristicas.pasajeros}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                    <Briefcase className="h-6 w-6 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Maletas</p>
                      <p className="font-bold">{vehiculo.caracteristicas.maletas}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                    <Settings className="h-6 w-6 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Transmisión</p>
                      <p className="font-bold">{vehiculo.caracteristicas.transmision}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                    <Fuel className="h-6 w-6 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Combustible</p>
                      <p className="font-bold">{vehiculo.caracteristicas.combustible}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                    <Car className="h-6 w-6 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Puertas</p>
                      <p className="font-bold">{vehiculo.caracteristicas.puertas}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                    <Check className="h-6 w-6 text-green-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">A/C</p>
                      <p className="font-bold">Sí</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Incluye */}
              <div className="mt-8">
                <h2 className="text-xl font-bold">Incluye</h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {vehiculo.incluye.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <Check className="h-5 w-5 shrink-0 text-green-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Descripción */}
              <div className="mt-8">
                <h2 className="text-xl font-bold">Descripción</h2>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">{vehiculo.descripcion}</p>
              </div>

              {/* Mapa de ubicación */}
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Ubicación del Vehículo</h2>
                  <button
                    onClick={() => setMostrarMapa(!mostrarMapa)}
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    {mostrarMapa ? 'Ocultar mapa' : 'Ver en mapa'}
                  </button>
                </div>
                {mostrarMapa && (
                  <MapaTracking
                    tipo="vehiculo"
                    actual={{
                      lat: vehiculo.ubicacion.lat,
                      lng: vehiculo.ubicacion.lng,
                      label: vehiculo.ubicacion.direccion,
                    }}
                    altura="400px"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Sidebar de reserva */}
          <div>
            <div className="sticky top-24 rounded-2xl border border-border bg-card p-6">
              <h3 className="text-xl font-bold">Reserva tu Vehículo</h3>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Fecha de Recogida</label>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Fecha de Devolución</label>
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    min={fechaInicio || new Date().toISOString().split('T')[0]}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {dias > 0 && (
                  <div className="rounded-xl bg-blue-50 p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span>RD$ {vehiculo.precio_dia.toLocaleString()} × {dias} días</span>
                      <span className="font-bold">RD$ {total.toLocaleString()}</span>
                    </div>
                    <div className="mt-3 border-t border-blue-200 pt-3 flex items-center justify-between">
                      <span className="font-bold">Total</span>
                      <span className="text-2xl font-bold text-primary">
                        RD$ {total.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                <button
                  disabled={dias === 0}
                  className="w-full rounded-xl bg-primary py-4 font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {dias === 0 ? 'Selecciona fechas' : 'Reservar Ahora'}
                </button>

                <p className="text-center text-xs text-muted-foreground">
                  No se te cobrará en este momento
                </p>
              </div>

              <div className="mt-6 space-y-3 border-t pt-6">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-5 w-5 text-green-600" />
                  <span>Cancelación gratis hasta 24h antes</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-5 w-5 text-green-600" />
                  <span>Confirmación inmediata</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-5 w-5 text-green-600" />
                  <span>Soporte 24/7</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
