import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Car, MapPin, Users, Briefcase, Fuel, Settings, Calendar, Search, SlidersHorizontal } from 'lucide-react';
import type { VehiculoRow } from '@/lib/types';

export const Route = createFileRoute('/vehiculos')({
  component: VehiculosPage,
});

// Datos de ejemplo (en producción vendrían de Cloudflare D1)
const vehiculosEjemplo: VehiculoRow[] = [
  {
    id: '1',
    store_id: 'rent-a-car-1',
    nombre: 'Toyota Corolla 2023',
    marca: 'Toyota',
    modelo: 'Corolla',
    año: 2023,
    tipo: 'sedan',
    precio_dia: 1500,
    disponible: true,
    imagenes: [
      'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800',
      'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800',
    ],
    ubicacion: {
      lat: 18.4861,
      lng: -69.9312,
      direccion: 'Santo Domingo, DN',
    },
    caracteristicas: {
      transmision: 'automatica',
      combustible: 'gasolina',
      pasajeros: 5,
      maletas: 2,
      puertas: 4,
      aire_acondicionado: true,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    store_id: 'rent-a-car-2',
    nombre: 'Honda CR-V 2024',
    marca: 'Honda',
    modelo: 'CR-V',
    año: 2024,
    tipo: 'suv',
    precio_dia: 2500,
    disponible: true,
    imagenes: [
      'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800',
    ],
    ubicacion: {
      lat: 18.4734,
      lng: -69.8933,
      direccion: 'Piantini, Santo Domingo',
    },
    caracteristicas: {
      transmision: 'automatica',
      combustible: 'hibrido',
      pasajeros: 7,
      maletas: 4,
      puertas: 4,
      aire_acondicionado: true,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    store_id: 'rent-a-car-1',
    nombre: 'Toyota Hiace 2023',
    marca: 'Toyota',
    modelo: 'Hiace',
    año: 2023,
    tipo: 'van',
    precio_dia: 3500,
    disponible: true,
    imagenes: [
      'https://images.unsplash.com/photo-1527786356703-4b100091cd2c?w=800',
    ],
    ubicacion: {
      lat: 18.4861,
      lng: -69.9312,
      direccion: 'Santo Domingo, DN',
    },
    caracteristicas: {
      transmision: 'manual',
      combustible: 'diesel',
      pasajeros: 15,
      maletas: 10,
      puertas: 4,
      aire_acondicionado: true,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const tiposVehiculo = [
  { value: 'all', label: 'Todos', icon: Car },
  { value: 'sedan', label: 'Sedán', icon: Car },
  { value: 'suv', label: 'SUV', icon: Car },
  { value: 'van', label: 'Van', icon: Car },
  { value: 'pickup', label: 'Pickup', icon: Car },
  { value: 'moto', label: 'Moto', icon: Car },
];

function VehiculosPage() {
  const [tipoFiltro, setTipoFiltro] = useState<string>('all');
  const [precioMax, setPrecioMax] = useState<number>(5000);
  const [busqueda, setBusqueda] = useState<string>('');

  const vehiculosFiltrados = vehiculosEjemplo.filter((v) => {
    const matchTipo = tipoFiltro === 'all' || v.tipo === tipoFiltro;
    const matchPrecio = v.precio_dia <= precioMax;
    const matchBusqueda =
      busqueda === '' ||
      v.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      v.marca.toLowerCase().includes(busqueda.toLowerCase()) ||
      v.modelo.toLowerCase().includes(busqueda.toLowerCase());
    return matchTipo && matchPrecio && matchBusqueda && v.disponible;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero con imagen de carretera */}
      <div className="relative bg-gradient-to-br from-primary to-brand py-16 text-white overflow-hidden">
        {/* Imagen de fondo - Carretera */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1600&q=80"
            alt="Carretera dominicana"
            className="h-full w-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-brand/80"></div>
        </div>

        {/* Contenido */}
        <div className="relative mx-auto max-w-7xl px-4">
          <div className="text-center">
            <Car className="mx-auto h-16 w-16 mb-4" />
            <h1 className="text-4xl font-bold sm:text-5xl">Renta de Vehículos</h1>
            <p className="mt-4 text-lg opacity-90">
              Encuentra el vehículo perfecto para tu viaje en República Dominicana
            </p>
          </div>

          {/* Búsqueda */}
          <div className="mx-auto mt-8 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 opacity-60" />
              <input
                type="text"
                placeholder="Buscar por marca, modelo o tipo..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full rounded-2xl bg-white/20 py-4 pl-12 pr-4 text-white placeholder-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          {/* Filtros */}
          <aside className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <SlidersHorizontal className="h-5 w-5 text-primary" />
                <h3 className="font-bold">Filtros</h3>
              </div>

              {/* Tipo de vehículo */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground">Tipo de Vehículo</h4>
                {tiposVehiculo.map((tipo) => (
                  <button
                    key={tipo.value}
                    onClick={() => setTipoFiltro(tipo.value)}
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                      tipoFiltro === tipo.value
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent'
                    }`}
                  >
                    <tipo.icon className="h-4 w-4" />
                    {tipo.label}
                  </button>
                ))}
              </div>

              {/* Precio */}
              <div className="mt-6 space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground">Precio por Día</h4>
                <input
                  type="range"
                  min="500"
                  max="5000"
                  step="100"
                  value={precioMax}
                  onChange={(e) => setPrecioMax(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-sm">
                  <span>RD$ 500</span>
                  <span className="font-bold text-primary">RD$ {precioMax.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Información */}
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <h4 className="font-bold text-blue-900">¿Necesitas ayuda?</h4>
              <p className="mt-2 text-sm text-blue-700">
                Contáctanos y te ayudamos a encontrar el vehículo perfecto para tu viaje.
              </p>
              <button className="mt-3 w-full rounded-xl bg-blue-600 py-2 text-sm font-bold text-white hover:bg-blue-700">
                WhatsApp
              </button>
            </div>
          </aside>

          {/* Lista de vehículos */}
          <div>
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {vehiculosFiltrados.length} vehículos disponibles
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {vehiculosFiltrados.map((vehiculo) => (
                <Link
                  key={vehiculo.id}
                  to="/vehiculos/$id"
                  params={{ id: vehiculo.id }}
                  className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-xl"
                >
                  {/* Imagen */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    <img
                      src={vehiculo.imagenes[0]}
                      alt={vehiculo.nombre}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute right-3 top-3 rounded-full bg-green-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
                      Disponible
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="font-bold text-lg">{vehiculo.nombre}</h3>
                    <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {vehiculo.ubicacion.direccion}
                    </div>

                    {/* Características */}
                    <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-primary" />
                        <span>{vehiculo.caracteristicas.pasajeros}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4 text-primary" />
                        <span>{vehiculo.caracteristicas.maletas}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Settings className="h-4 w-4 text-primary" />
                        <span className="capitalize">{vehiculo.caracteristicas.transmision}</span>
                      </div>
                    </div>

                    {/* Precio */}
                    <div className="mt-4 flex items-end justify-between border-t pt-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Desde</p>
                        <p className="text-2xl font-bold text-primary">
                          RD$ {vehiculo.precio_dia.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">por día</p>
                      </div>
                      <button className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90">
                        Rentar
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {vehiculosFiltrados.length === 0 && (
              <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center">
                <Car className="mx-auto h-16 w-16 text-muted-foreground" />
                <h3 className="mt-4 font-bold text-lg">No hay vehículos disponibles</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Intenta ajustar los filtros o buscar con otros términos
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
