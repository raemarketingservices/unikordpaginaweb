import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/cloudflare'
import { Package, TrendingUp, Users, MessageSquare, Bell } from 'lucide-react'

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
})

interface Order {
  id: string
  product_id: string
  customer_name: string
  customer_phone: string
  quantity: number
  total: number
  status: string
  created_at: string
  delivery_address: string
}

interface ChatMessage {
  id: string
  customer_name: string
  message: string
  created_at: string
  read: number
}

function DashboardPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0, revenue: 0 })

  useEffect(() => {
    if (!user?.store_id) return

    // Fetch orders
    api<Order[]>(`/api/stores/${user.store_id}/orders`).then(data => {
      setOrders(data)
      const total = data.length
      const pending = data.filter(o => o.status === 'pending').length
      const completed = data.filter(o => o.status === 'completed').length
      const revenue = data.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.total, 0)
      setStats({ total, pending, completed, revenue })
    }).catch(() => {})

    // Fetch unread messages
    api<ChatMessage[]>(`/api/stores/${user.store_id}/messages`).then(setMessages).catch(() => {})
  }, [user?.store_id])

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await api(`/api/orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      })
      setOrders(orders.map(o => o.id === orderId ? { ...o, status } : o))
    } catch (error) {
      console.error('Error updating order:', error)
    }
  }

  if (!user?.store_id) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Acceso Denegado</CardTitle>
            <CardDescription>Necesitas ser vendedor para acceder al dashboard</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard de Vendedor</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pedidos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">RD${stats.revenue.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="orders">Pedidos</TabsTrigger>
          <TabsTrigger value="messages">
            Mensajes {messages.length > 0 && <Badge className="ml-2">{messages.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          {orders.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">No hay pedidos aún</p>
              </CardContent>
            </Card>
          ) : (
            orders.map(order => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{order.customer_name}</CardTitle>
                    <Badge variant={
                      order.status === 'pending' ? 'secondary' :
                      order.status === 'processing' ? 'default' :
                      order.status === 'shipped' ? 'outline' :
                      order.status === 'completed' ? 'default' : 'destructive'
                    }>
                      {order.status === 'pending' ? 'Pendiente' :
                       order.status === 'processing' ? 'Procesando' :
                       order.status === 'shipped' ? 'Enviado' :
                       order.status === 'completed' ? 'Completado' : 'Cancelado'}
                    </Badge>
                  </div>
                  <CardDescription>
                    Pedido #{order.id.slice(0, 8)} · {new Date(order.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p><strong>Cantidad:</strong> {order.quantity}</p>
                    <p><strong>Total:</strong> RD${order.total.toFixed(2)}</p>
                    <p><strong>Teléfono:</strong> {order.customer_phone}</p>
                    {order.delivery_address && (
                      <p><strong>Dirección:</strong> {order.delivery_address}</p>
                    )}

                    <div className="flex gap-2 mt-4">
                      <Select value={order.status} onValueChange={(val) => updateOrderStatus(order.id, val)}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Cambiar estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendiente</SelectItem>
                          <SelectItem value="processing">Procesando</SelectItem>
                          <SelectItem value="shipped">Enviado</SelectItem>
                          <SelectItem value="completed">Completado</SelectItem>
                          <SelectItem value="cancelled">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button variant="outline" size="sm" asChild>
                        <a href={`https://wa.me/${order.customer_phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          WhatsApp
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          {messages.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">No hay mensajes nuevos</p>
              </CardContent>
            </Card>
          ) : (
            messages.map(msg => (
              <Card key={msg.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{msg.customer_name}</CardTitle>
                    {msg.read === 0 && <Badge>Nuevo</Badge>}
                  </div>
                  <CardDescription>{new Date(msg.created_at).toLocaleString()}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>{msg.message}</p>
                  <Button className="mt-4" size="sm">Responder</Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
