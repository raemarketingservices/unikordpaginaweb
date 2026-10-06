import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import {
  ArrowLeft,
  MessageSquare,
  Users,
  TrendingUp,
  Clock,
  Star,
  Activity,
  Send,
  CheckCircle,
  AlertCircle,
  Calendar,
  Filter,
  Download,
  Settings,
  MoreVertical,
  Phone,
  Video,
  Paperclip,
  Image as ImageIcon,
} from 'lucide-react';
import type { ChatConversation, ChatMessage } from '@/lib/chat-types';

export const Route = createFileRoute('/admin/stores/$storeId')({
  component: StoreDetailPage,
});

function StoreDetailPage() {
  const { storeId } = Route.useParams();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'conversations' | 'analytics' | 'customers'>('conversations');

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Store Info & Conversations */}
      <div className="w-96 border-r border-gray-200 bg-white flex flex-col">
        {/* Store Header */}
        <StoreHeader storeId={storeId} />

        {/* Tabs */}
        <div className="border-b border-gray-200 px-4">
          <div className="flex gap-2">
            {[
              { id: 'conversations', label: 'Conversaciones' },
              { id: 'analytics', label: 'Analíticas' },
              { id: 'customers', label: 'Clientes' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 font-bold transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'conversations' && (
            <ConversationsList
              storeId={storeId}
              selectedId={selectedConversation}
              onSelect={setSelectedConversation}
            />
          )}
          {activeTab === 'analytics' && <StoreAnalytics storeId={storeId} />}
          {activeTab === 'customers' && <StoreCustomers storeId={storeId} />}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <ChatArea conversationId={selectedConversation} />
        ) : (
          <EmptyState />
        )}
      </div>

      {/* Details Panel */}
      {selectedConversation && (
        <div className="w-80 border-l border-gray-200 bg-white">
          <ConversationDetails conversationId={selectedConversation} />
        </div>
      )}
    </div>
  );
}

function StoreHeader({ storeId }: { storeId: string }) {
  const store = {
    name: 'Fashion Store RD',
    logo: '👗',
    status: 'online',
    plan: 'Premium',
    activeChats: 8,
    unread: 12,
  };

  return (
    <div className="border-b border-gray-200 p-6">
      <a
        href="/admin/crm"
        className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al CRM
      </a>

      <div className="flex items-center gap-4">
        <div className="text-5xl">{store.logo}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-gray-900">{store.name}</h2>
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-700">
              {store.plan}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${store.status === 'online' ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="text-sm text-gray-600">{store.status === 'online' ? 'En línea' : 'Fuera de línea'}</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-blue-50 p-3">
          <p className="text-xs text-blue-700 font-medium">Chats Activos</p>
          <p className="text-2xl font-bold text-blue-900">{store.activeChats}</p>
        </div>
        <div className="rounded-lg bg-red-50 p-3">
          <p className="text-xs text-red-700 font-medium">Sin Leer</p>
          <p className="text-2xl font-bold text-red-900">{store.unread}</p>
        </div>
      </div>
    </div>
  );
}

function ConversationsList({
  storeId,
  selectedId,
  onSelect,
}: {
  storeId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const conversations = [
    {
      id: '1',
      customerName: 'María González',
      lastMessage: '¿Tienen este vestido en talla M?',
      lastMessageAt: new Date(Date.now() - 120000).toISOString(),
      unreadCount: 2,
      priority: 'high',
      status: 'active',
    },
    {
      id: '2',
      customerName: 'Juan Pérez',
      lastMessage: 'Perfecto, muchas gracias',
      lastMessageAt: new Date(Date.now() - 900000).toISOString(),
      unreadCount: 0,
      priority: 'normal',
      status: 'active',
    },
    {
      id: '3',
      customerName: 'Ana Martínez',
      lastMessage: 'Me interesa ver más opciones',
      lastMessageAt: new Date(Date.now() - 1800000).toISOString(),
      unreadCount: 1,
      priority: 'normal',
      status: 'active',
    },
  ];

  return (
    <div className="p-4 space-y-2">
      {conversations.map((conv) => (
        <button
          key={conv.id}
          onClick={() => onSelect(conv.id)}
          className={`w-full rounded-xl border p-4 text-left transition-all ${
            selectedId === conv.id
              ? 'border-blue-300 bg-blue-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 font-bold text-white">
              {conv.customerName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-bold text-gray-900 truncate">{conv.customerName}</h4>
                <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                  {formatTime(conv.lastMessageAt)}
                </span>
              </div>
              <p className="text-sm text-gray-600 truncate">{conv.lastMessage}</p>
              <div className="mt-2 flex items-center gap-2">
                {conv.unreadCount > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                    {conv.unreadCount}
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
        </button>
      ))}
    </div>
  );
}

function StoreAnalytics({ storeId }: { storeId: string }) {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="font-bold text-gray-900 mb-4">Métricas de Rendimiento</h3>
        <div className="space-y-3">
          <MetricCard label="Tasa de Respuesta" value="96.2%" trend="+2.3%" />
          <MetricCard label="Tiempo Promedio" value="1.8m" trend="-0.5m" />
          <MetricCard label="Satisfacción" value="4.8/5" trend="+0.2" />
          <MetricCard label="Conversiones" value="67" trend="+12" />
        </div>
      </div>

      <div>
        <h3 className="font-bold text-gray-900 mb-4">Actividad Hoy</h3>
        <div className="space-y-2">
          <ActivityItem time="10:30 AM" action="Conversación iniciada" customer="María G." />
          <ActivityItem time="10:15 AM" action="Pedido confirmado" customer="Juan P." />
          <ActivityItem time="09:45 AM" action="Mensaje respondido" customer="Ana M." />
        </div>
      </div>
    </div>
  );
}

function StoreCustomers({ storeId }: { storeId: string }) {
  const customers = [
    { name: 'María González', chats: 5, lastSeen: '2m', status: 'active' },
    { name: 'Juan Pérez', chats: 12, lastSeen: '15m', status: 'active' },
    { name: 'Ana Martínez', chats: 3, lastSeen: '1h', status: 'idle' },
  ];

  return (
    <div className="p-4 space-y-2">
      {customers.map((customer, i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 font-bold text-green-700">
              {customer.name.charAt(0)}
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-900">{customer.name}</h4>
              <p className="text-xs text-gray-600">{customer.chats} conversaciones</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">{customer.lastSeen}</p>
              <div className={`mt-1 h-2 w-2 rounded-full ${customer.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ChatArea({ conversationId }: { conversationId: string }) {
  const [newMessage, setNewMessage] = useState('');
  const messages: ChatMessage[] = [
    {
      id: '1',
      conversation_id: conversationId,
      sender_type: 'customer',
      sender_id: 'customer-1',
      sender_name: 'María González',
      message_type: 'text',
      content: 'Hola, me interesa este vestido',
      attachments: null,
      replied_to_id: null,
      edited: false,
      deleted: false,
      read_by_customer: true,
      read_by_store: true,
      read_at: new Date().toISOString(),
      created_at: new Date(Date.now() - 300000).toISOString(),
      updated_at: new Date(Date.now() - 300000).toISOString(),
    },
  ];

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 font-bold text-white">
            M
          </div>
          <div>
            <h3 className="font-bold text-gray-900">María González</h3>
            <p className="text-sm text-gray-600">En línea</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-lg p-2 text-gray-600 hover:bg-gray-100">
            <Phone className="h-5 w-5" />
          </button>
          <button className="rounded-lg p-2 text-gray-600 hover:bg-gray-100">
            <Video className="h-5 w-5" />
          </button>
          <button className="rounded-lg p-2 text-gray-600 hover:bg-gray-100">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`mb-4 flex ${msg.sender_type === 'store' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                msg.sender_type === 'store'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-900 shadow-sm'
              }`}
            >
              {msg.sender_type === 'customer' && (
                <p className="mb-1 text-xs font-bold text-blue-600">{msg.sender_name}</p>
              )}
              <p className="text-sm leading-relaxed">{msg.content}</p>
              <span className={`mt-1 text-xs ${msg.sender_type === 'store' ? 'text-white/70' : 'text-gray-500'}`}>
                {new Date(msg.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="flex items-end gap-2">
          <button className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
            <Paperclip className="h-5 w-5" />
          </button>
          <button className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
            <ImageIcon className="h-5 w-5" />
          </button>
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Escribe un mensaje..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <button className="rounded-xl bg-blue-600 p-3 text-white hover:bg-blue-700">
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </>
  );
}

function ConversationDetails({ conversationId }: { conversationId: string }) {
  return (
    <div className="h-full overflow-y-auto p-6">
      <h3 className="mb-6 text-lg font-bold text-gray-900">Información del Cliente</h3>
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-3xl font-bold text-white">
            M
          </div>
          <h4 className="mt-3 text-xl font-bold text-gray-900">María González</h4>
          <p className="text-sm text-gray-600">Cliente desde hace 2 meses</p>
        </div>

        <div className="space-y-3">
          <InfoItem label="Email" value="maria@example.com" />
          <InfoItem label="Teléfono" value="+1 809 555 1234" />
          <InfoItem label="Conversaciones" value="5" />
          <InfoItem label="Última actividad" value="Hace 2 minutos" />
        </div>

        <div>
          <h4 className="mb-3 text-sm font-bold text-gray-900">Etiquetas</h4>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">VIP</span>
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">Frecuente</span>
          </div>
        </div>

        <button className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white hover:bg-blue-700">
          Enviar Formulario
        </button>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-blue-100 p-6">
            <MessageSquare className="h-12 w-12 text-blue-600" />
          </div>
        </div>
        <h3 className="mb-2 text-2xl font-bold text-gray-900">Selecciona una conversación</h3>
        <p className="text-gray-600">Elige un chat de la lista para comenzar</p>
      </div>
    </div>
  );
}

function MetricCard({ label, value, trend }: { label: string; value: string; trend: string }) {
  const isPositive = trend.startsWith('+');
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <p className="text-xs text-gray-600">{label}</p>
      <div className="flex items-center justify-between mt-1">
        <p className="text-lg font-bold text-gray-900">{value}</p>
        <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {trend}
        </span>
      </div>
    </div>
  );
}

function ActivityItem({ time, action, customer }: { time: string; action: string; customer: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
      <div className="rounded-lg bg-blue-100 p-2">
        <Activity className="h-4 w-4 text-blue-600" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{action}</p>
        <p className="text-xs text-gray-600">{customer} • {time}</p>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-gray-600">{label}</p>
      <p className="text-sm text-gray-900">{value}</p>
    </div>
  );
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Ahora';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
  return date.toLocaleDateString('es');
}
