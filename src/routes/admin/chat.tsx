import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Search,
  Video,
  Phone,
  MoreVertical,
  Send,
  Image as ImageIcon,
  Paperclip,
  Smile,
  Check,
  CheckCheck,
  Clock,
  Filter,
  Archive,
  Star,
  Tag,
  Users,
  TrendingUp,
  X,
  ChevronLeft,
} from 'lucide-react';
import type { ChatConversation, ChatMessage } from '@/lib/chat-types';

export const Route = createFileRoute('/admin/chat')({
  component: ChatAdminPage,
});

export function ChatAdminPage() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Lista de conversaciones */}
      {showSidebar && (
        <div className="w-96 border-r border-border bg-card">
          <ConversationsList
            onSelectConversation={setSelectedConversation}
            selectedId={selectedConversation}
          />
        </div>
      )}

      {/* Chat principal */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <ChatArea
            conversationId={selectedConversation}
            onBack={() => setSelectedConversation(null)}
          />
        ) : (
          <EmptyState />
        )}
      </div>

      {/* Panel lateral - Detalles */}
      {selectedConversation && (
        <div className="w-80 border-l border-border bg-card">
          <ConversationDetails conversationId={selectedConversation} />
        </div>
      )}
    </div>
  );
}

function ConversationsList({
  onSelectConversation,
  selectedId,
}: {
  onSelectConversation: (id: string) => void;
  selectedId: string | null;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'active'>('all');

  const mockConversations: ChatConversation[] = [
    {
      id: '1',
      store_id: 'store-1',
      customer_id: 'customer-1',
      customer_name: 'Juan Pérez',
      customer_phone: '+1 809 555 1234',
      customer_email: 'juan@example.com',
      product_id: null,
      order_id: null,
      status: 'active',
      priority: 'normal',
      last_message: '¿Tienen disponible este producto en talla M?',
      last_message_at: new Date(Date.now() - 300000).toISOString(),
      last_message_from: 'customer',
      unread_count_customer: 0,
      unread_count_store: 2,
      tags: null,
      notes: null,
      video_call_active: false,
      video_call_room_id: null,
      video_call_started_at: null,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date(Date.now() - 300000).toISOString(),
      closed_at: null,
    },
    {
      id: '2',
      store_id: 'store-1',
      customer_id: null,
      customer_name: 'María González',
      customer_phone: '+1 809 555 5678',
      customer_email: null,
      product_id: 'prod-123',
      order_id: null,
      status: 'active',
      priority: 'high',
      last_message: 'Perfecto, gracias por la información',
      last_message_at: new Date(Date.now() - 600000).toISOString(),
      last_message_from: 'store',
      unread_count_customer: 1,
      unread_count_store: 0,
      tags: null,
      notes: null,
      video_call_active: false,
      video_call_room_id: null,
      video_call_started_at: null,
      created_at: new Date(Date.now() - 7200000).toISOString(),
      updated_at: new Date(Date.now() - 600000).toISOString(),
      closed_at: null,
    },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border bg-background p-4">
        <h2 className="mb-4 text-2xl font-bold text-foreground flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-green-600" />
          Chat en Vivo
        </h2>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar conversaciones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-input bg-background py-2 pl-10 pr-4 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
          />
        </div>

        {/* Filters */}
        <div className="mt-3 flex gap-2">
          {['all', 'unread', 'active'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`rounded-lg px-3 py-1 text-sm font-bold transition-colors ${
                filter === f
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? 'Todas' : f === 'unread' ? 'No leídas' : 'Activas'}
            </button>
          ))}
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {mockConversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelectConversation(conv.id)}
            className={`w-full border-b border-border p-4 text-left transition-colors hover:bg-accent ${
              selectedId === conv.id ? 'bg-accent' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600 font-bold">
                {conv.customer_name.charAt(0).toUpperCase()}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-foreground truncate">{conv.customer_name}</h3>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                    {formatTime(conv.last_message_at!)}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground truncate">{conv.last_message}</p>

                <div className="mt-2 flex items-center gap-2">
                  {conv.priority === 'high' && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                      Urgente
                    </span>
                  )}
                  {conv.unread_count_store > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">
                      {conv.unread_count_store}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="border-t border-border bg-background p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-green-600">12</p>
            <p className="text-xs text-muted-foreground">Activas</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-600">5</p>
            <p className="text-xs text-muted-foreground">Sin leer</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">2.5m</p>
            <p className="text-xs text-muted-foreground">Resp. promedio</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatArea({ conversationId, onBack }: { conversationId: string; onBack: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    loadMessages();
  }, [conversationId]);

  const loadMessages = () => {
    const mockMessages: ChatMessage[] = [
      {
        id: '1',
        conversation_id: conversationId,
        sender_type: 'customer',
        sender_id: 'customer-1',
        sender_name: 'Juan Pérez',
        message_type: 'text',
        content: 'Hola, quisiera información sobre este producto',
        attachments: null,
        replied_to_id: null,
        edited: false,
        deleted: false,
        read_by_customer: true,
        read_by_store: true,
        read_at: new Date().toISOString(),
        created_at: new Date(Date.now() - 600000).toISOString(),
        updated_at: new Date(Date.now() - 600000).toISOString(),
      },
      {
        id: '2',
        conversation_id: conversationId,
        sender_type: 'store',
        sender_id: 'store-1',
        sender_name: 'Tienda UNIKO',
        message_type: 'text',
        content: '¡Hola! Claro, con gusto te ayudo. ¿Qué necesitas saber?',
        attachments: null,
        replied_to_id: null,
        edited: false,
        deleted: false,
        read_by_customer: true,
        read_by_store: true,
        read_at: new Date().toISOString(),
        created_at: new Date(Date.now() - 540000).toISOString(),
        updated_at: new Date(Date.now() - 540000).toISOString(),
      },
      {
        id: '3',
        conversation_id: conversationId,
        sender_type: 'customer',
        sender_id: 'customer-1',
        sender_name: 'Juan Pérez',
        message_type: 'text',
        content: '¿Tienen disponible este producto en talla M?',
        attachments: null,
        replied_to_id: null,
        edited: false,
        deleted: false,
        read_by_customer: true,
        read_by_store: false,
        read_at: null,
        created_at: new Date(Date.now() - 300000).toISOString(),
        updated_at: new Date(Date.now() - 300000).toISOString(),
      },
    ];
    setMessages(mockMessages);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: ChatMessage = {
      id: 'temp-' + Date.now(),
      conversation_id: conversationId,
      sender_type: 'store',
      sender_id: 'store-1',
      sender_name: 'Tienda UNIKO',
      message_type: 'text',
      content: newMessage,
      attachments: null,
      replied_to_id: null,
      edited: false,
      deleted: false,
      read_by_customer: false,
      read_by_store: true,
      read_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setMessages([...messages, message]);
    setNewMessage('');
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-background p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="lg:hidden rounded-lg p-2 hover:bg-accent transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600 font-bold">
            J
          </div>
          <div>
            <h3 className="font-bold text-foreground">Juan Pérez</h3>
            <p className="text-sm text-muted-foreground">En línea</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="rounded-lg p-2 text-muted-foreground hover:bg-accent transition-colors">
            <Video className="h-5 w-5" />
          </button>
          <button className="rounded-lg p-2 text-muted-foreground hover:bg-accent transition-colors">
            <Phone className="h-5 w-5" />
          </button>
          <button className="rounded-lg p-2 text-muted-foreground hover:bg-accent transition-colors">
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
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-900 shadow-sm'
              }`}
            >
              {msg.sender_type === 'customer' && (
                <p className="mb-1 text-xs font-bold text-green-600">{msg.sender_name}</p>
              )}
              <p className="text-sm leading-relaxed">{msg.content}</p>
              <div
                className={`mt-1 flex items-center gap-1 text-xs ${
                  msg.sender_type === 'store' ? 'text-white/70' : 'text-gray-500'
                }`}
              >
                <span>
                  {new Date(msg.created_at).toLocaleTimeString('es', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {msg.sender_type === 'store' && (
                  <>
                    {msg.read_by_customer ? (
                      <CheckCheck className="h-3 w-3" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="mb-4 flex justify-start">
            <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '150ms' }} />
                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border bg-white p-4">
        <div className="flex items-end gap-2">
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept="*/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                console.log('Archivo seleccionado:', file.name);
                // TODO: Implementar subida de archivo
              }
            }}
          />
          <button
            onClick={() => document.getElementById('file-upload')?.click()}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition-colors"
            title="Adjuntar archivo"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <input
            type="file"
            id="image-upload"
            className="hidden"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                console.log('Imagen seleccionada:', file.name);
                // TODO: Implementar subida de imagen
              }
            }}
          />
          <button
            onClick={() => document.getElementById('image-upload')?.click()}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition-colors"
            title="Adjuntar imagen"
          >
            <ImageIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => {
              console.log('Emoji picker abierto');
              // TODO: Implementar selector de emoji
            }}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition-colors"
            title="Emoji"
          >
            <Smile className="h-5 w-5" />
          </button>
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Escribe un mensaje..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="rounded-xl bg-green-600 p-3 text-white transition-colors hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
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
      <h3 className="mb-6 text-lg font-bold text-foreground">Detalles del Cliente</h3>

      {/* Customer Info */}
      <div className="mb-6">
        <div className="mb-4 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-3xl font-bold text-green-600">
            J
          </div>
        </div>
        <h4 className="text-center text-xl font-bold text-foreground">Juan Pérez</h4>
        <p className="text-center text-sm text-muted-foreground">Cliente desde hace 3 meses</p>
      </div>

      {/* Contact Info */}
      <div className="mb-6 space-y-3">
        <div>
          <p className="text-xs font-bold text-muted-foreground">Teléfono</p>
          <p className="text-sm text-foreground">+1 809 555 1234</p>
        </div>
        <div>
          <p className="text-xs font-bold text-muted-foreground">Email</p>
          <p className="text-sm text-foreground">juan@example.com</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6 space-y-2">
        <button className="w-full rounded-xl bg-green-600 py-3 font-bold text-white hover:bg-green-700 transition-colors">
          Enviar Formulario de Pedido
        </button>
        <button className="w-full rounded-xl border-2 border-green-600 py-3 font-bold text-green-600 hover:bg-green-50 transition-colors">
          Ver Historial
        </button>
      </div>

      {/* Tags */}
      <div className="mb-6">
        <h4 className="mb-3 text-sm font-bold text-foreground">Etiquetas</h4>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
            Cliente frecuente
          </span>
          <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
            Premium
          </span>
        </div>
      </div>

      {/* Notes */}
      <div>
        <h4 className="mb-3 text-sm font-bold text-foreground">Notas Internas</h4>
        <textarea
          placeholder="Agregar notas sobre este cliente..."
          rows={4}
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
        />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-green-100 p-6">
            <MessageSquare className="h-12 w-12 text-green-600" />
          </div>
        </div>
        <h3 className="mb-2 text-2xl font-bold text-foreground">Selecciona una conversación</h3>
        <p className="text-muted-foreground">
          Elige un chat de la lista para comenzar a responder
        </p>
      </div>
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
