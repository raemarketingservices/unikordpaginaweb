/**
 * Sistema de WebSocket simple para chat en tiempo real
 * Usando localStorage y polling como alternativa ligera
 */

export interface RealtimeMessage {
  type: 'message.new' | 'message.read' | 'typing.start' | 'typing.stop' | 'conversation.updated';
  conversationId: string;
  data: any;
  timestamp: number;
}

export class ChatRealtime {
  private listeners: Map<string, Set<(message: RealtimeMessage) => void>> = new Map();
  private pollingInterval: number | null = null;
  private lastMessageId: string | null = null;

  /**
   * Conectar al sistema de tiempo real
   */
  connect(conversationId: string, onMessage: (message: RealtimeMessage) => void) {
    // Agregar listener
    if (!this.listeners.has(conversationId)) {
      this.listeners.set(conversationId, new Set());
    }
    this.listeners.get(conversationId)!.add(onMessage);

    // Iniciar polling si no está activo
    if (!this.pollingInterval) {
      this.startPolling();
    }

    // Retornar función de cleanup
    return () => {
      const listeners = this.listeners.get(conversationId);
      if (listeners) {
        listeners.delete(onMessage);
        if (listeners.size === 0) {
          this.listeners.delete(conversationId);
        }
      }

      // Detener polling si no hay listeners
      if (this.listeners.size === 0 && this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }
    };
  }

  /**
   * Enviar un evento a todos los listeners de una conversación
   */
  broadcast(conversationId: string, type: RealtimeMessage['type'], data: any) {
    const message: RealtimeMessage = {
      type,
      conversationId,
      data,
      timestamp: Date.now(),
    };

    // Guardar en localStorage para sincronización entre pestañas
    this.saveToLocalStorage(message);

    // Notificar a listeners locales
    const listeners = this.listeners.get(conversationId);
    if (listeners) {
      listeners.forEach(listener => listener(message));
    }
  }

  /**
   * Polling ligero para verificar nuevos mensajes
   */
  private startPolling() {
    this.pollingInterval = window.setInterval(() => {
      this.checkForNewMessages();
    }, 3000) as any; // Check cada 3 segundos
  }

  /**
   * Verificar si hay nuevos mensajes
   */
  private async checkForNewMessages() {
    const conversationIds = Array.from(this.listeners.keys());

    for (const conversationId of conversationIds) {
      try {
        // Hacer request a la API para verificar nuevos mensajes
        const response = await fetch(`/api/chat/messages/${conversationId}/new?after=${this.lastMessageId || ''}`);

        if (response.ok) {
          const data = await response.json();

          if (data.messages && data.messages.length > 0) {
            // Notificar nuevos mensajes
            data.messages.forEach((msg: any) => {
              this.broadcast(conversationId, 'message.new', msg);
              this.lastMessageId = msg.id;
            });
          }
        }
      } catch (error) {
        console.error('Error checking for new messages:', error);
      }
    }
  }

  /**
   * Guardar mensaje en localStorage para sincronización entre pestañas
   */
  private saveToLocalStorage(message: RealtimeMessage) {
    try {
      const key = `chat_realtime_${message.conversationId}`;
      localStorage.setItem(key, JSON.stringify(message));

      // Limpiar después de 5 segundos
      setTimeout(() => {
        localStorage.removeItem(key);
      }, 5000);
    } catch (error) {
      // Ignorar errores de localStorage
    }
  }

  /**
   * Escuchar cambios en localStorage (para sincronizar entre pestañas)
   */
  static initCrossTabSync() {
    window.addEventListener('storage', (e) => {
      if (e.key?.startsWith('chat_realtime_') && e.newValue) {
        try {
          const message: RealtimeMessage = JSON.parse(e.newValue);
          // Emitir evento personalizado
          window.dispatchEvent(new CustomEvent('chat-message', { detail: message }));
        } catch (error) {
          // Ignorar errores de parsing
        }
      }
    });
  }
}

// Instancia global
export const chatRealtime = new ChatRealtime();

// Inicializar sincronización entre pestañas
if (typeof window !== 'undefined') {
  ChatRealtime.initCrossTabSync();
}

/**
 * Hook de React para usar el realtime
 */
export function useChatRealtime(
  conversationId: string | null,
  onMessage: (message: RealtimeMessage) => void
) {
  if (typeof window === 'undefined') return;

  if (!conversationId) return;

  const cleanup = chatRealtime.connect(conversationId, onMessage);

  // Cleanup cuando el componente se desmonte
  return cleanup;
}

/**
 * Indicador de "escribiendo..."
 */
export class TypingIndicator {
  private timers: Map<string, number> = new Map();

  /**
   * Notificar que el usuario está escribiendo
   */
  startTyping(conversationId: string, userId: string, userName: string) {
    // Limpiar timer anterior si existe
    const existingTimer = this.timers.get(conversationId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Broadcast evento de typing
    chatRealtime.broadcast(conversationId, 'typing.start', {
      userId,
      userName,
    });

    // Auto-detener después de 3 segundos
    const timer = window.setTimeout(() => {
      this.stopTyping(conversationId, userId);
    }, 3000);

    this.timers.set(conversationId, timer as any);
  }

  /**
   * Notificar que el usuario dejó de escribir
   */
  stopTyping(conversationId: string, userId: string) {
    const timer = this.timers.get(conversationId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(conversationId);
    }

    chatRealtime.broadcast(conversationId, 'typing.stop', {
      userId,
    });
  }
}

export const typingIndicator = new TypingIndicator();

/**
 * Notificaciones de escritorio
 */
export class ChatNotifications {
  private permission: NotificationPermission = 'default';

  constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  /**
   * Solicitar permiso para notificaciones
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    const permission = await Notification.requestPermission();
    this.permission = permission;
    return permission === 'granted';
  }

  /**
   * Mostrar notificación
   */
  show(title: string, options?: NotificationOptions) {
    if (this.permission !== 'granted') {
      return;
    }

    new Notification(title, {
      icon: '/logo.png',
      badge: '/logo.png',
      ...options,
    });
  }

  /**
   * Notificación de nuevo mensaje
   */
  showNewMessage(senderName: string, message: string, conversationId: string) {
    this.show(`Nuevo mensaje de ${senderName}`, {
      body: message.substring(0, 100),
      tag: conversationId,
      data: { conversationId },
    });
  }
}

export const chatNotifications = new ChatNotifications();

/**
 * Estado de conexión
 */
export class ConnectionStatus {
  private status: 'online' | 'offline' | 'connecting' = 'online';
  private listeners: Set<(status: typeof this.status) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.setStatus('online'));
      window.addEventListener('offline', () => this.setStatus('offline'));
    }
  }

  getStatus() {
    return this.status;
  }

  setStatus(status: typeof this.status) {
    this.status = status;
    this.listeners.forEach(listener => listener(status));
  }

  subscribe(listener: (status: typeof this.status) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const connectionStatus = new ConnectionStatus();
