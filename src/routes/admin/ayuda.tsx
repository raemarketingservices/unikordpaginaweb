import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { MessageSquare, Send, Image as ImageIcon, Paperclip, Headset } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export const Route = createFileRoute('/admin/ayuda')({
  component: StoreHelpChat,
});

type Message = {
  id: string;
  sender_type: 'admin' | 'store';
  content: string;
  created_at: string;
  read_at: string | null;
};

export function StoreHelpChat() {
  const { profile } = useAuth();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);

  useEffect(() => {
    loadStore();
  }, [profile]);

  useEffect(() => {
    if (storeId) {
      loadOrCreateConversation();
    }
  }, [storeId]);

  useEffect(() => {
    if (conversationId) {
      loadMessages();
      const interval = setInterval(loadMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [conversationId]);

  const loadStore = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id')
        .eq('user_id', profile.id)
        .single();

      if (error) throw error;
      setStoreId(data.id);
    } catch (err) {
      console.error('Error loading store:', err);
      toast.error('No se pudo cargar la información de la tienda');
    }
  };

  const loadOrCreateConversation = async () => {
    if (!storeId || !profile) return;

    try {
      // Check if conversation exists
      let { data: existing, error: existingError } = await supabase
        .from('admin_chat_conversations')
        .select('id')
        .eq('store_id', storeId)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing) {
        setConversationId(existing.id);
      } else {
        // Create new conversation - get admin ID first
        const { data: adminData, error: adminError } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'admin')
          .limit(1)
          .single();

        if (adminError) throw adminError;

        const { data: newConv, error: createError } = await supabase
          .from('admin_chat_conversations')
          .insert({
            store_id: storeId,
            admin_id: adminData.id,
            status: 'active',
          })
          .select('id')
          .single();

        if (createError) throw createError;
        setConversationId(newConv.id);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error with conversation:', err);
      toast.error('No se pudo cargar la conversación');
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!conversationId) return;

    try {
      const { data, error } = await supabase
        .from('admin_chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark admin messages as read
      await supabase
        .from('admin_chat_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('sender_type', 'admin')
        .is('read_at', null);

      await supabase
        .from('admin_chat_conversations')
        .update({ unread_count_store: 0 })
        .eq('id', conversationId);
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversationId || !profile) return;

    try {
      const { error } = await supabase
        .from('admin_chat_messages')
        .insert({
          conversation_id: conversationId,
          sender_type: 'store',
          sender_id: profile.id,
          content: newMessage.trim(),
          message_type: 'text',
          delivered_at: new Date().toISOString(),
        });

      if (error) throw error;

      setNewMessage('');
      loadMessages();
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('No se pudo enviar el mensaje');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <p className="text-gray-500">Cargando chat...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] bg-white rounded-xl border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="flex items-center gap-3 text-white">
          <Headset className="h-6 w-6" />
          <div>
            <h2 className="font-bold text-lg">Soporte Admin</h2>
            <p className="text-sm text-blue-100">Pregúntanos cualquier duda sobre la plataforma</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
            <MessageSquare className="h-16 w-16 mb-4" />
            <p className="text-lg font-semibold mb-2">¡Hola! Estamos aquí para ayudarte</p>
            <p className="text-sm">Escribe tu pregunta y te responderemos lo antes posible</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender_type === 'store' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                  msg.sender_type === 'store'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-900 border border-gray-200'
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                <span
                  className={`text-xs mt-1 block ${
                    msg.sender_type === 'store' ? 'text-blue-100' : 'text-gray-500'
                  }`}
                >
                  {new Date(msg.created_at).toLocaleTimeString('es-DO', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="flex items-center gap-2">
          <input
            type="file"
            id="store-help-file"
            className="hidden"
            accept="*/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                console.log('Archivo:', file.name);
                // TODO: Upload
              }
            }}
          />
          <button
            onClick={() => document.getElementById('store-help-file')?.click()}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            title="Adjuntar archivo"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <input
            type="file"
            id="store-help-image"
            className="hidden"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                console.log('Imagen:', file.name);
                // TODO: Upload
              }
            }}
          />
          <button
            onClick={() => document.getElementById('store-help-image')?.click()}
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
            placeholder="Escribe tu pregunta..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Send className="h-5 w-5" />
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
