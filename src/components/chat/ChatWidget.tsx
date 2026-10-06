import { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Image as ImageIcon,
  Paperclip,
  Video,
  Phone,
  Smile,
  ChevronDown,
  Check,
  CheckCheck,
} from 'lucide-react';
import type { ChatConversation, ChatMessage } from '@/lib/chat-types';
import { chatRealtime, typingIndicator, chatNotifications } from '@/lib/chat-realtime';

interface Props {
  storeId: string;
  storeName: string;
  storeAvatar?: string;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  productId?: string;
  position?: 'bottom-right' | 'bottom-left';
}

export function ChatWidget({
  storeId,
  storeName,
  storeAvatar,
  customerId,
  customerName,
  customerEmail,
  customerPhone,
  productId,
  position = 'bottom-right',
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
  };

  useEffect(() => {
    if (isOpen && !conversationId) {
      initializeConversation();
    }
  }, [isOpen]);

  useEffect(() => {
    if (conversationId) {
      loadMessages();

      // Conectar al sistema de tiempo real
      const cleanup = chatRealtime.connect(conversationId, (message) => {
        if (message.type === 'message.new') {
          setMessages(prev => [...prev, message.data]);

          // Mostrar notificación si es de la tienda
          if (message.data.sender_type === 'store' && !document.hasFocus()) {
            chatNotifications.showNewMessage(
              message.data.sender_name,
              message.data.content,
              conversationId
            );
          }
        } else if (message.type === 'typing.start') {
          setIsTyping(true);
        } else if (message.type === 'typing.stop') {
          setIsTyping(false);
        }
      });

      // Solicitar permiso para notificaciones
      chatNotifications.requestPermission();

      return cleanup;
    }
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeConversation = async () => {
    // TODO: Implementar llamada a API
    const mockConversationId = 'conv-' + Date.now();
    setConversationId(mockConversationId);
  };

  const loadMessages = async () => {
    // TODO: Implementar llamada a API
    const mockMessages: ChatMessage[] = [
      {
        id: '1',
        conversation_id: conversationId!,
        sender_type: 'store',
        sender_id: null,
        sender_name: storeName,
        message_type: 'text',
        content: '¡Hola! ¿En qué puedo ayudarte hoy?',
        attachments: null,
        replied_to_id: null,
        edited: false,
        deleted: false,
        read_by_customer: true,
        read_by_store: true,
        read_at: new Date().toISOString(),
        created_at: new Date(Date.now() - 60000).toISOString(),
        updated_at: new Date(Date.now() - 60000).toISOString(),
      },
    ];
    setMessages(mockMessages);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversationId) return;

    const message: ChatMessage = {
      id: 'temp-' + Date.now(),
      conversation_id: conversationId,
      sender_type: 'customer',
      sender_id: customerId || null,
      sender_name: customerName || 'Cliente',
      message_type: 'text',
      content: newMessage,
      attachments: null,
      replied_to_id: null,
      edited: false,
      deleted: false,
      read_by_customer: true,
      read_by_store: false,
      read_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setMessages([...messages, message]);
    setNewMessage('');

    // Detener indicador de typing
    typingIndicator.stopTyping(conversationId, customerId || 'customer');

    // Enviar a API
    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          message: newMessage,
          senderId: customerId,
          senderName: customerName || 'Cliente',
          senderType: 'customer',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Broadcast mensaje a otros listeners
        chatRealtime.broadcast(conversationId, 'message.new', data.message);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !conversationId) return;

    const file = files[0];

    // Validar tamaño (10 MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('El archivo es muy grande. Máximo 10 MB');
      return;
    }

    // Subir a R2
    const formData = new FormData();
    formData.append('file', file);
    formData.append('conversationId', conversationId);
    formData.append('messageId', 'temp-' + Date.now());
    formData.append('uploadedBy', 'customer');

    try {
      const response = await fetch('/api/chat/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();

        // Crear mensaje con el archivo
        const message: ChatMessage = {
          id: 'temp-' + Date.now(),
          conversation_id: conversationId,
          sender_type: 'customer',
          sender_id: customerId || null,
          sender_name: customerName || 'Cliente',
          message_type: data.file.category,
          content: data.file.url,
          attachments: JSON.stringify([data.file]),
          replied_to_id: null,
          edited: false,
          deleted: false,
          read_by_customer: true,
          read_by_store: false,
          read_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setMessages([...messages, message]);

        // Broadcast
        chatRealtime.broadcast(conversationId, 'message.new', message);
      } else {
        alert('Error al subir el archivo');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error al subir el archivo');
    }
  };

  const handleTyping = () => {
    if (conversationId) {
      typingIndicator.startTyping(
        conversationId,
        customerId || 'customer',
        customerName || 'Cliente'
      );
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed ${positionClasses[position]} z-50 flex h-16 w-16 items-center justify-center rounded-full bg-green-600 text-white shadow-2xl transition-transform hover:scale-110 hover:bg-green-700`}
      >
        <MessageSquare className="h-8 w-8" />
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>
    );
  }

  return (
    <div
      className={`fixed ${positionClasses[position]} z-50 flex h-[600px] w-96 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl`}
    >
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-green-600 to-emerald-600 p-4 text-white">
        <div className="flex items-center gap-3">
          {storeAvatar ? (
            <img src={storeAvatar} alt={storeName} className="h-10 w-10 rounded-full" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <MessageSquare className="h-6 w-6" />
            </div>
          )}
          <div>
            <h3 className="font-bold">{storeName}</h3>
            <p className="text-xs opacity-90">En línea</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-2 hover:bg-white/20 transition-colors"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-2 hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`mb-4 flex ${msg.sender_type === 'customer' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.sender_type === 'customer'
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-900 shadow-sm'
              }`}
            >
              {msg.sender_type === 'store' && (
                <p className="mb-1 text-xs font-bold text-green-600">{msg.sender_name}</p>
              )}
              <p className="text-sm leading-relaxed">{msg.content}</p>
              <div
                className={`mt-1 flex items-center gap-1 text-xs ${
                  msg.sender_type === 'customer' ? 'text-white/70' : 'text-gray-500'
                }`}
              >
                <span>{new Date(msg.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</span>
                {msg.sender_type === 'customer' && (
                  <>
                    {msg.read_by_store ? (
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
                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0ms' }} />
                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '150ms' }} />
                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="flex items-end gap-2">
          <button
            onClick={handleFileSelect}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <button className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition-colors">
            <ImageIcon className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <textarea
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              onKeyPress={handleKeyPress}
              placeholder="Escribe un mensaje..."
              rows={1}
              className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="rounded-xl bg-green-600 p-3 text-white transition-colors hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Quick Actions */}
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-2">
        <div className="flex gap-2 text-xs">
          <button className="flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-gray-700 hover:bg-gray-100 transition-colors">
            <Video className="h-4 w-4" />
            Videollamada
          </button>
          <button className="flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-gray-700 hover:bg-gray-100 transition-colors">
            <Phone className="h-4 w-4" />
            Llamar
          </button>
        </div>
      </div>
    </div>
  );
}
