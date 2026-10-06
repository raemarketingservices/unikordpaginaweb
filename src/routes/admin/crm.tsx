import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Store,
  Users,
  TrendingUp,
  Activity,
  DollarSign,
  ShoppingBag,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  PieChart,
  Calendar,
  Search,
  Filter,
  Download,
  RefreshCw,
} from 'lucide-react';

export const Route = createFileRoute('/admin/crm')({
  component: CRMDashboard,
});

export function CRMDashboard() {
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('week');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 p-3 text-white">
                <BarChart3 className="h-8 w-8" />
              </div>
              CRM Dashboard - UNIKO-RD
            </h1>
            <p className="mt-2 text-gray-600">
              Panel de control central para todas las tiendas y conversaciones
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700"
            >
              <option value="today">Hoy</option>
              <option value="week">Esta Semana</option>
              <option value="month">Este Mes</option>
              <option value="all">Todo el Tiempo</option>
            </select>

            <button className="rounded-xl bg-blue-600 px-6 py-2 font-bold text-white hover:bg-blue-700 transition-colors flex items-center gap-2">
              <Download className="h-5 w-5" />
              Exportar
            </button>

            <button className="rounded-xl border-2 border-gray-300 p-2 hover:bg-gray-50 transition-colors">
              <RefreshCw className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8">
        {/* Global Stats */}
        <GlobalStats dateRange={dateRange} />

        {/* Stores Grid */}
        <div className="mt-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Tiendas Activas</h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar tiendas..."
                  className="rounded-xl border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <button className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtros
              </button>
            </div>
          </div>

          <StoresGrid onSelectStore={setSelectedStore} />
        </div>

        {/* Recent Activity */}
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <RecentConversations />
          <TopPerformingStores />
        </div>

        {/* Charts */}
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <ConversationsTrend />
          <ResponseTimeChart />
        </div>
      </div>
    </div>
  );
}

function GlobalStats({ dateRange }: { dateRange: string }) {
  const stats = [
    {
      title: 'Total Conversaciones',
      value: '1,284',
      change: '+12.5%',
      trend: 'up',
      icon: MessageSquare,
      color: 'blue',
    },
    {
      title: 'Tiendas Activas',
      value: '47',
      change: '+3',
      trend: 'up',
      icon: Store,
      color: 'green',
    },
    {
      title: 'Clientes Únicos',
      value: '892',
      change: '+8.2%',
      trend: 'up',
      icon: Users,
      color: 'purple',
    },
    {
      title: 'Tasa de Respuesta',
      value: '94.3%',
      change: '+2.1%',
      trend: 'up',
      icon: Activity,
      color: 'orange',
    },
    {
      title: 'Tiempo Promedio',
      value: '2.4m',
      change: '-15s',
      trend: 'up',
      icon: Clock,
      color: 'cyan',
    },
    {
      title: 'Conversiones',
      value: '356',
      change: '+18.9%',
      trend: 'up',
      icon: ShoppingBag,
      color: 'pink',
    },
  ];

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    cyan: 'bg-cyan-100 text-cyan-600',
    pink: 'bg-pink-100 text-pink-600',
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {stats.map((stat) => (
        <div key={stat.title} className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className={`rounded-xl p-3 ${colorClasses[stat.color as keyof typeof colorClasses]}`}>
              <stat.icon className="h-6 w-6" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600 mb-2">{stat.title}</p>
          <p className="text-2xl font-bold text-gray-900 mb-2">{stat.value}</p>
          <p className={`text-xs font-semibold ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {stat.change} vs período anterior
          </p>
        </div>
      ))}
    </div>
  );
}

function StoresGrid({ onSelectStore }: { onSelectStore: (id: string) => void }) {
  const stores = [
    {
      id: '1',
      name: 'Fashion Store RD',
      logo: '👗',
      conversations: 156,
      unread: 12,
      active: 8,
      responseTime: '1.8m',
      satisfaction: 4.8,
      status: 'online',
    },
    {
      id: '2',
      name: 'Tech Paradise',
      logo: '💻',
      conversations: 243,
      unread: 5,
      active: 15,
      responseTime: '2.2m',
      satisfaction: 4.9,
      status: 'online',
    },
    {
      id: '3',
      name: 'Food Delivery Express',
      logo: '🍔',
      conversations: 389,
      unread: 28,
      active: 32,
      responseTime: '1.2m',
      satisfaction: 4.6,
      status: 'online',
    },
    {
      id: '4',
      name: 'Beauty & Cosmetics',
      logo: '💄',
      conversations: 178,
      unread: 7,
      active: 11,
      responseTime: '3.1m',
      satisfaction: 4.7,
      status: 'online',
    },
    {
      id: '5',
      name: 'Home & Deco',
      logo: '🏠',
      conversations: 92,
      unread: 3,
      active: 4,
      responseTime: '2.8m',
      satisfaction: 4.9,
      status: 'away',
    },
    {
      id: '6',
      name: 'Sports & Fitness',
      logo: '⚽',
      conversations: 126,
      unread: 9,
      active: 6,
      responseTime: '2.5m',
      satisfaction: 4.8,
      status: 'online',
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {stores.map((store) => (
        <button
          key={store.id}
          onClick={() => onSelectStore(store.id)}
          className="rounded-2xl border border-gray-200 bg-white p-6 text-left transition-all hover:border-blue-300 hover:shadow-lg"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="text-4xl">{store.logo}</div>
              <div>
                <h3 className="font-bold text-gray-900">{store.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`h-2 w-2 rounded-full ${store.status === 'online' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <span className="text-xs text-gray-600">{store.status === 'online' ? 'En línea' : 'Ausente'}</span>
                </div>
              </div>
            </div>
            {store.unread > 0 && (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                {store.unread}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-600">Conversaciones</p>
              <p className="text-lg font-bold text-gray-900">{store.conversations}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Activas</p>
              <p className="text-lg font-bold text-green-600">{store.active}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Tiempo Resp.</p>
              <p className="text-sm font-bold text-gray-900">{store.responseTime}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Satisfacción</p>
              <div className="flex items-center gap-1">
                <p className="text-sm font-bold text-yellow-600">{store.satisfaction}</p>
                <span className="text-yellow-500">⭐</span>
              </div>
            </div>
          </div>

          {/* Action */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-600 font-medium">Ver Dashboard →</span>
              <MessageSquare className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function RecentConversations() {
  const conversations = [
    {
      store: 'Fashion Store RD',
      customer: 'María González',
      message: '¿Tienen este vestido en talla M?',
      time: '2m',
      status: 'unread',
      priority: 'high',
    },
    {
      store: 'Tech Paradise',
      customer: 'Juan Pérez',
      message: 'Gracias por la información',
      time: '15m',
      status: 'read',
      priority: 'normal',
    },
    {
      store: 'Food Delivery',
      customer: 'Ana Martínez',
      message: '¿Cuánto tarda el delivery?',
      time: '23m',
      status: 'unread',
      priority: 'urgent',
    },
    {
      store: 'Beauty & Cosmetics',
      customer: 'Carlos Rodríguez',
      message: 'Perfecto, lo quiero',
      time: '1h',
      status: 'read',
      priority: 'normal',
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <h3 className="mb-6 text-xl font-bold text-gray-900">Conversaciones Recientes</h3>
      <div className="space-y-4">
        {conversations.map((conv, i) => (
          <div key={i} className="flex items-start gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-600">
              {conv.customer.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-bold text-gray-900">{conv.customer}</h4>
                <span className="text-xs text-gray-500">{conv.time}</span>
              </div>
              <p className="text-xs text-gray-600 mb-1">{conv.store}</p>
              <p className="text-sm text-gray-700 truncate">{conv.message}</p>
              <div className="mt-2 flex items-center gap-2">
                {conv.status === 'unread' && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                    No leído
                  </span>
                )}
                {conv.priority === 'urgent' && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                    Urgente
                  </span>
                )}
                {conv.priority === 'high' && (
                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700">
                    Alta
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopPerformingStores() {
  const stores = [
    { name: 'Tech Paradise', score: 98, conversations: 243, conversions: 89, avatar: '💻' },
    { name: 'Food Delivery', score: 96, conversations: 389, conversions: 156, avatar: '🍔' },
    { name: 'Fashion Store', score: 94, conversations: 156, conversions: 67, avatar: '👗' },
    { name: 'Beauty & Cosmetics', score: 93, conversations: 178, conversions: 71, avatar: '💄' },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <h3 className="mb-6 text-xl font-bold text-gray-900">Mejores Tiendas del Mes</h3>
      <div className="space-y-4">
        {stores.map((store, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 font-bold text-white">
              {i + 1}
            </div>
            <div className="text-3xl">{store.avatar}</div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-900">{store.name}</h4>
              <div className="mt-1 flex items-center gap-4 text-xs text-gray-600">
                <span>{store.conversations} chats</span>
                <span>•</span>
                <span>{store.conversions} conversiones</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">{store.score}</p>
              <p className="text-xs text-gray-600">Score</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConversationsTrend() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <h3 className="mb-6 text-xl font-bold text-gray-900">Tendencia de Conversaciones</h3>
      <div className="h-64 flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl">
        <p className="text-gray-500">Gráfico de líneas (próximamente con Chart.js)</p>
      </div>
    </div>
  );
}

function ResponseTimeChart() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <h3 className="mb-6 text-xl font-bold text-gray-900">Tiempo de Respuesta por Tienda</h3>
      <div className="h-64 flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
        <p className="text-gray-500">Gráfico de barras (próximamente con Chart.js)</p>
      </div>
    </div>
  );
}
