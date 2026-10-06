import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MapPin, Phone, MessageSquare, Star, Search } from 'lucide-react'
import { api } from '@/lib/cloudflare'

export const Route = createFileRoute('/servicios')({
  component: ServiciosPage,
})

interface ProfessionalService {
  id: string
  service_type: string
  name: string
  description: string
  phone: string
  whatsapp: string
  lat: number
  lng: number
  province: string
  municipality: string
  image: string
  rating: number
}

const serviceTypes = [
  { value: 'Electricista', icon: '⚡', color: 'bg-yellow-500' },
  { value: 'Plomero', icon: '🔧', color: 'bg-blue-500' },
  { value: 'Carpintero', icon: '🪚', color: 'bg-amber-600' },
  { value: 'Pintor', icon: '🎨', color: 'bg-purple-500' },
  { value: 'Mecánico', icon: '🔩', color: 'bg-gray-600' },
  { value: 'Albañil', icon: '🧱', color: 'bg-orange-500' },
  { value: 'Jardinero', icon: '🌱', color: 'bg-green-500' },
  { value: 'Limpieza', icon: '🧹', color: 'bg-cyan-500' },
]

const provinces = [
  'Santo Domingo', 'Santiago', 'La Vega', 'San Cristóbal', 'Puerto Plata',
  'San Pedro de Macorís', 'La Romana', 'Barahona', 'San Juan', 'Azua'
]

function ServiciosPage() {
  const [services, setServices] = useState<ProfessionalService[]>([])
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedProvince, setSelectedProvince] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredServices, setFilteredServices] = useState<ProfessionalService[]>([])

  useEffect(() => {
    api<ProfessionalService[]>('/api/professional-services').then(data => {
      setServices(data)
      setFilteredServices(data)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    let filtered = services

    if (selectedType !== 'all') {
      filtered = filtered.filter(s => s.service_type === selectedType)
    }

    if (selectedProvince !== 'all') {
      filtered = filtered.filter(s => s.province === selectedProvince)
    }

    if (searchQuery) {
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredServices(filtered)
  }, [selectedType, selectedProvince, searchQuery, services])

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Servicios Profesionales</h1>
          <p className="text-muted-foreground">Encuentra electricistas, plomeros, carpinteros y más</p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar servicios..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Service Type Filter */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3">Tipo de Servicio</h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              variant={selectedType === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedType('all')}
              size="sm"
            >
              Todos
            </Button>
            {serviceTypes.map(type => (
              <Button
                key={type.value}
                variant={selectedType === type.value ? 'default' : 'outline'}
                onClick={() => setSelectedType(type.value)}
                size="sm"
                className="gap-2"
              >
                <span>{type.icon}</span>
                {type.value}
              </Button>
            ))}
          </div>
        </div>

        {/* Province Filter */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3">Zona</h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
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
        </div>

        {/* Services Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map(service => {
            const serviceType = serviceTypes.find(t => t.value === service.service_type)

            return (
              <Card key={service.id} className="overflow-hidden">
                {/* Image/Icon */}
                <div className={`relative h-48 ${serviceType?.color || 'bg-primary'}`}>
                  {service.image ? (
                    <img
                      src={service.image}
                      alt={service.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-6xl">{serviceType?.icon || '🔧'}</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-background/90 text-foreground">
                      {service.service_type}
                    </Badge>
                  </div>
                </div>

                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{service.name}</span>
                    {service.rating > 0 && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="ml-1">{service.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </CardTitle>
                  <CardDescription>{service.description}</CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground">
                        {service.municipality}, {service.province}
                      </span>
                    </div>
                    {service.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-muted-foreground">{service.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button className="flex-1" asChild>
                      <a href={`/servicio/${service.id}`}>Ver Perfil</a>
                    </Button>
                    {service.whatsapp && (
                      <Button variant="default" size="icon" asChild className="bg-green-500 hover:bg-green-600">
                        <a
                          href={`https://wa.me/${service.whatsapp.replace(/\D/g, '')}?text=Hola, necesito información sobre tus servicios`}
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
            )
          })}
        </div>

        {filteredServices.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-muted-foreground">
                No se encontraron servicios profesionales con estos filtros
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
