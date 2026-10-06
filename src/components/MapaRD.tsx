import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MapPin, Store, Zap, Navigation, Loader2 } from 'lucide-react'
import { api } from '@/lib/cloudflare'

interface Store {
  id: string
  name: string
  category: string
  logo: string
  lat: number
  lng: number
  province: string
  verified: boolean
}

interface Service {
  id: string
  name: string
  service_type: string
  image: string
  lat: number
  lng: number
  province: string
}

const serviceIcons: Record<string, string> = {
  'Electricista': '⚡',
  'Plomero': '🔧',
  'Carpintero': '🪚',
  'Pintor': '🎨',
  'Mecánico': '🔩',
  'Albañil': '🧱',
  'Jardinero': '🌱',
  'Limpieza': '🧹',
}

export function MapaRD() {
  const [stores, setStores] = useState<Store[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [selectedType, setSelectedType] = useState<'stores' | 'services' | 'all'>('all')
  const [mapLoaded, setMapLoaded] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])

  // Cargar Leaflet CSS y JS
  useEffect(() => {
    // Cargar CSS
    if (!document.querySelector('link[href*="leaflet.css"]')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
      link.crossOrigin = ''
      document.head.appendChild(link)
    }

    // Cargar JS
    if (!(window as any).L) {
      const script = document.createElement('script')
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo='
      script.crossOrigin = ''
      script.onload = () => {
        setMapLoaded(true)
      }
      document.body.appendChild(script)
    } else {
      setMapLoaded(true)
    }
  }, [])

  // Cargar datos
  useEffect(() => {
    api<Store[]>('/api/stores').then(data => {
      setStores(data.filter(s => s.lat && s.lng))
    }).catch(() => {})

    api<Service[]>('/api/professional-services').then(data => {
      setServices(data.filter(s => s.lat && s.lng))
    }).catch(() => {})
  }, [])

  // Inicializar mapa
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !(window as any).L || leafletMapRef.current) return

    const L = (window as any).L

    // Centro de República Dominicana
    const map = L.map(mapRef.current).setView([18.7357, -70.1627], 8)

    // Agregar capa de mapa de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    leafletMapRef.current = map
  }, [mapLoaded])

  // Actualizar marcadores
  useEffect(() => {
    if (!leafletMapRef.current || !mapLoaded) return

    const L = (window as any).L

    // Limpiar marcadores anteriores
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []

    const visibleStores = selectedType === 'services' ? [] : stores
    const visibleServices = selectedType === 'stores' ? [] : services

    // Crear marcadores para tiendas
    visibleStores.forEach(store => {
      const icon = L.divIcon({
        html: `<div style="background: #a855f7; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/><path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2"/></svg></div>`,
        className: '',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      })

      const marker = L.marker([store.lat, store.lng], { icon }).addTo(leafletMapRef.current)

      const popupContent = `
        <div style="min-width: 200px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            ${store.logo ? `<img src="${store.logo}" alt="" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;" />` : ''}
            <div>
              <p style="margin: 0; font-weight: 600; font-size: 14px;">${store.name}</p>
              ${store.verified ? '<span style="font-size: 11px; color: #059669;">✓ Verificada</span>' : ''}
            </div>
          </div>
          ${store.category ? `<p style="margin: 4px 0; font-size: 12px; color: #666;">${store.category}</p>` : ''}
          <p style="margin: 4px 0; font-size: 12px; color: #666;">📍 ${store.province}</p>
          <a href="/tienda/${store.id}" style="display: inline-block; margin-top: 8px; padding: 6px 12px; background: #a855f7; color: white; text-decoration: none; border-radius: 6px; font-size: 12px;">Ver Tienda</a>
        </div>
      `

      marker.bindPopup(popupContent)
      markersRef.current.push(marker)
    })

    // Crear marcadores para servicios
    visibleServices.forEach(service => {
      const emoji = serviceIcons[service.service_type] || '🔧'

      const icon = L.divIcon({
        html: `<div style="background: #f59e0b; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); font-size: 16px;">${emoji}</div>`,
        className: '',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      })

      const marker = L.marker([service.lat, service.lng], { icon }).addTo(leafletMapRef.current)

      const popupContent = `
        <div style="min-width: 200px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="font-size: 24px;">${emoji}</span>
            <div>
              <p style="margin: 0; font-weight: 600; font-size: 14px;">${service.name}</p>
              <span style="font-size: 11px; color: #059669;">${service.service_type}</span>
            </div>
          </div>
          <p style="margin: 4px 0; font-size: 12px; color: #666;">📍 ${service.province}</p>
          <a href="/servicio/${service.id}" style="display: inline-block; margin-top: 8px; padding: 6px 12px; background: #f59e0b; color: white; text-decoration: none; border-radius: 6px; font-size: 12px;">Ver Perfil</a>
        </div>
      `

      marker.bindPopup(popupContent)
      markersRef.current.push(marker)
    })
  }, [stores, services, selectedType, mapLoaded])

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              Mapa de República Dominicana
            </CardTitle>
            <CardDescription>Tiendas y servicios profesionales cerca de ti</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={selectedType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedType('all')}
            >
              Todos
            </Button>
            <Button
              variant={selectedType === 'stores' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedType('stores')}
            >
              <Store className="h-4 w-4 mr-1" />
              Tiendas
            </Button>
            <Button
              variant={selectedType === 'services' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedType('services')}
            >
              <Zap className="h-4 w-4 mr-1" />
              Servicios
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Leaflet Map Container */}
        <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden border-2 border-border bg-gray-100">
          {!mapLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 z-10">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Cargando mapa...</p>
              </div>
            </div>
          )}
          <div ref={mapRef} className="w-full h-full" />
        </div>

        {/* Leyenda */}
        <div className="flex flex-wrap gap-4 mt-4 justify-center">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-purple-500" />
            <span className="text-sm text-muted-foreground">Tiendas ({stores.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-amber-500" />
            <span className="text-sm text-muted-foreground">Servicios ({services.length})</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
