import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Phone, MessageSquare, Star } from 'lucide-react'
import { api } from '@/lib/cloudflare'

export const Route = createFileRoute('/tiendas')({
  component: TiendasPage,
})

interface Store {
  id: string
  name: string
  description: string
  category: string
  logo: string
  cover: string
  rating: number
  reviews: number
  verified: boolean
  lat: number
  lng: number
  province: string
  municipality: string
  whatsapp: string
  location: string
}

function TiendasPage() {
  const [stores, setStores] = useState<Store[]>([])
  const [selectedProvince, setSelectedProvince] = useState<string>('all')
  const [filteredStores, setFilteredStores] = useState<Store[]>([])

  const provinces = [
    'Santo Domingo', 'Santiago', 'La Vega', 'San Cristóbal', 'Puerto Plata',
    'San Pedro de Macorís', 'La Romana', 'Barahona', 'San Juan', 'Azua'
  ]

  useEffect(() => {
    api<Store[]>('/api/stores').then(data => {
      setStores(data)
      setFilteredStores(data)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedProvince === 'all') {
      setFilteredStores(stores)
    } else {
      setFilteredStores(stores.filter(s => s.province === selectedProvince))
    }
  }, [selectedProvince, stores])

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Tiendas en República Dominicana</h1>
          <p className="text-muted-foreground">Encuentra negocios cerca de ti</p>
        </div>

        {/* Map Placeholder */}
        <Card className="mb-8">
          <CardContent className="p-0">
            <div className="relative w-full h-[400px] bg-gradient-to-br from-blue-100 to-green-100 rounded-lg overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="h-16 w-16 mx-auto mb-4 text-primary" />
                  <p className="text-lg font-semibold">Mapa de República Dominicana</p>
                  <p className="text-sm text-muted-foreground">
                    {filteredStores.length} tiendas encontradas
                  </p>
                </div>
              </div>

              {/* Store markers simulation */}
              {filteredStores.slice(0, 10).map((store, idx) => (
                <div
                  key={store.id}
                  className="absolute w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 transition-transform"
                  style={{
                    left: `${20 + (idx * 8)}%`,
                    top: `${30 + (idx * 5) % 40}%`,
                  }}
                  title={store.name}
                >
                  <MapPin className="h-4 w-4 text-primary-foreground" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Province Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <Button
            variant={selectedProvince === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedProvince('all')}
            size="sm"
          >
            Todas
          </Button>
          {provinces.map(province => (
            <Button
              key={province}
              variant={selectedProvince === province ? 'default' : 'outline'}
              onClick={() => setSelectedProvince(province)}
              size="sm"
            >
              {province}
            </Button>
          ))}
        </div>

        {/* Stores List */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredStores.map(store => (
            <Card key={store.id} className="overflow-hidden">
              {/* Banner */}
              <div className="relative h-32 bg-gradient-to-r from-primary/20 to-primary/10">
                {store.cover && (
                  <img
                    src={store.cover}
                    alt={store.name}
                    className="w-full h-full object-cover"
                  />
                )}
                {store.verified && (
                  <Badge className="absolute top-2 right-2">Verificada</Badge>
                )}
              </div>

              {/* Logo */}
              <div className="relative px-6 -mt-12">
                <div className="w-24 h-24 rounded-full bg-background border-4 border-background shadow-lg overflow-hidden">
                  {store.logo ? (
                    <img
                      src={store.logo}
                      alt={store.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                      <span className="text-2xl font-bold text-primary">
                        {store.name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <CardHeader className="pt-4">
                <CardTitle className="flex items-center gap-2">
                  {store.name}
                  {store.rating > 0 && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="ml-1">{store.rating.toFixed(1)}</span>
                    </div>
                  )}
                </CardTitle>
                <CardDescription>
                  {store.category && <Badge variant="outline" className="mr-2">{store.category}</Badge>}
                  {store.description}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="space-y-2 mb-4">
                  {store.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{store.location}</span>
                    </div>
                  )}
                  {store.municipality && store.province && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {store.municipality}, {store.province}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1" asChild>
                    <a href={`/tienda/${store.id}`}>Ver Tienda</a>
                  </Button>
                  {store.whatsapp && (
                    <Button variant="outline" size="icon" asChild>
                      <a
                        href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredStores.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-muted-foreground">
                No se encontraron tiendas en esta ubicación
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
