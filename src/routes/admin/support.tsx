import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Search,
  Send,
  Image as ImageIcon,
  Paperclip,
  Store,
  User,
  Clock,
  CheckCheck,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export const Route = createFileRoute('/admin/support')({
  component: AdminSupportChat,
});

type AdminConversation = {
  id: string;
  store_id: string;
  store_name: string;
  store_logo?: string;
  last_message: string;
  last_message_at: string;
  unread_count_admin: number;
  status: string;
};

type AdminMessage = {
  id: string;
  sender_type: 'admin' | 'store';
  content: string;
  message_type: string;
  attachments: any[];
  created_at: string;
  read_at: string | null;
};

export function AdminSupportChat() {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedConversationId) {
      loadMessages(selectedConversationId);
      const interval = setInterval(() => loadMessages(selectedConversationId), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedConversationId]);

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_chat_conversations')
        .select(`
          id,
          store_id,
          last_message,
          last_message_at,
          unread_count_admin,
          status,
          stores (
            id,
            name,
            logo
          )
        `)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      const formatted = data?.map((conv: any) => ({
        id: conv.id,
        store_id: conv.store_id,
        store_name: conv.stores?.name || 'Tienda sin nombre',
        store_logo: conv.stores?.logo,
        last_message: conv.last_message || '',
        last_message_at: conv.last_message_at,
        unread_count_admin: conv.unread_count_admin || 0,
        status: conv.status,
      })) || [];

      setConversations(formatted);
      setLoading(false);
    } catch (err) {
      console.error('Error loading conversations:', err);
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('admin_chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark as read
      await supabase
        .from('admin_chat_conversations')
        .update({ unread_count_admin: 0 })
        .eq('id', conversationId);

      await supabase
        .from('admin_chat_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .is('read_at', null)
        .eq('sender_type', 'store');
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversationId || !profile) return;

    try {
      const { error } = await supabase
        .from('admin_chat_messages')
        .insert({
          conversation_id: selectedConversationId,
          sender_type: 'admin',
          sender_id: profile.id,
          content: newMessage.trim(),
          message_type: 'text',
          delivered_at: new Date().toISOString(),
        });

      if (error) throw error;

      setNewMessage('');
      loadMessages(selectedConversationId);
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('No se pudo enviar el mensaje');
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.store_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-200px)] bg-gray-50">
      {/* Conversations List */}
      <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-blue-600" />
            Soporte Tiendas
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar tienda..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Cargando...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No hay conversaciones</div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedConversationId(conv.id)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedConversationId === conv.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {conv.store_logo ? (
                      <img src={conv.store_logo} alt={conv.store_name} className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <Store className="h-6 w-6 text-blue-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{conv.store_name}</h3>
                      {conv.unread_count_admin > 0 && (
                        <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                          {conv.unread_count_admin}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 truncate">{conv.last_message}</p>
                    <span className="text-xs text-gray-400">
                      {new Date(conv.last_message_at).toLocaleString('es-DO')}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedConversationId ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Store className="h-6 w-6 text-blue-600" />
                <div>
                  <h3 className="font-bold text-gray-900">
                    {conversations.find(c => c.id === selectedConversationId)?.store_name}
                  </h3>
                  <span className="text-sm text-gray-500">Soporte Admin</span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] ${msg.sender_type === 'admin' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'} rounded-2xl px-4 py-2`}>
                    <p className="text-sm">{msg.content}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs ${msg.sender_type === 'admin' ? 'text-blue-100' : 'text-gray-500'}`}>
                        {new Date(msg.created_at).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {msg.sender_type === 'admin' && (
                        <CheckCheck className={`h-3 w-3 ${msg.read_at ? 'text-blue-200' : 'text-blue-300'}`} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  id="admin-file-upload"
                  className="hidden"
                  accept="*/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      console.log('Archivo:', file.name);
                      // TODO: Upload to R2
                    }
                  }}
                />
                <button
                  onClick={() => document.getElementById('admin-file-upload')?.click()}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Adjuntar archivo"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                <input
                  type="file"
                  id="admin-image-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      console.log('Imagen:', file.name);
                      // TODO: Upload to R2
                    }
                  }}
                />
                <button
                  onClick={() => document.getElementById('admin-image-upload')?.click()}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Adjuntar imagen"
                >
                  <ImageIcon className="h-5 w-5" />
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p>Selecciona una conversación para comenzar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
