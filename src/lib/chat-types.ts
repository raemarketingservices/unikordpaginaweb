// Tipos para el sistema de chat en tiempo real

export type ConversationStatus = 'active' | 'closed' | 'archived';
export type ConversationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file' | 'product' | 'order' | 'form' | 'system';
export type SenderType = 'customer' | 'store' | 'system';
export type FileType = 'image' | 'video' | 'audio' | 'document' | 'other';
export type VideoCallStatus = 'ringing' | 'active' | 'ended' | 'missed' | 'rejected';
export type FormType = 'order' | 'quote' | 'contact' | 'feedback' | 'custom';
export type FormStatus = 'pending' | 'filled' | 'submitted' | 'expired';

// Conversación
export interface ChatConversationRow {
  id: string;
  store_id: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;

  product_id: string | null;
  order_id: string | null;

  status: ConversationStatus;
  priority: ConversationPriority;

  last_message: string | null;
  last_message_at: string | null;
  last_message_from: 'customer' | 'store' | null;

  unread_count_customer: number;
  unread_count_store: number;

  tags: string | null; // JSON
  notes: string | null;

  video_call_active: boolean;
  video_call_room_id: string | null;
  video_call_started_at: string | null;

  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

// Mensaje
export interface ChatMessageRow {
  id: string;
  conversation_id: string;

  sender_type: SenderType;
  sender_id: string | null;
  sender_name: string;

  message_type: MessageType;
  content: string;

  attachments: string | null; // JSON

  replied_to_id: string | null;
  edited: boolean;
  deleted: boolean;

  read_by_customer: boolean;
  read_by_store: boolean;
  read_at: string | null;

  created_at: string;
  updated_at: string;
}

// Archivo adjunto
export interface ChatAttachmentRow {
  id: string;
  conversation_id: string;
  message_id: string;

  file_type: FileType;
  file_name: string;
  file_size: number;
  mime_type: string;

  storage_url: string;
  thumbnail_url: string | null;

  width: number | null;
  height: number | null;
  duration: number | null;

  created_at: string;
}

// Participante
export interface ChatParticipantRow {
  id: string;
  conversation_id: string;
  user_id: string;
  user_type: 'customer' | 'store_owner' | 'store_admin' | 'support';

  can_send_messages: boolean;
  can_send_media: boolean;
  can_start_video_call: boolean;

  joined_at: string;
  left_at: string | null;
  is_active: boolean;

  last_seen_at: string | null;
  last_read_message_id: string | null;
}

// Videollamada
export interface ChatVideoCallRow {
  id: string;
  conversation_id: string;

  room_id: string;
  room_url: string;

  initiated_by: 'customer' | 'store';
  initiator_id: string | null;

  status: VideoCallStatus;

  started_at: string;
  answered_at: string | null;
  ended_at: string | null;
  duration: number | null;

  recording_url: string | null;
  quality_rating: number | null;

  created_at: string;
}

// Formulario
export interface ChatFormRow {
  id: string;
  conversation_id: string;
  message_id: string;

  form_type: FormType;
  form_data: string; // JSON

  status: FormStatus;

  filled_by: 'customer' | 'store' | null;
  filled_at: string | null;
  responses: string | null; // JSON

  expires_at: string | null;

  created_at: string;
  updated_at: string;
}

// Reacción
export interface ChatReactionRow {
  id: string;
  message_id: string;
  user_id: string;
  user_type: 'customer' | 'store';
  reaction: string;
  created_at: string;
}

// Tipos para inserción
export type ChatConversationInsert = Omit<ChatConversationRow, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};

export type ChatMessageInsert = Omit<ChatMessageRow, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};

export type ChatAttachmentInsert = Omit<ChatAttachmentRow, 'id' | 'created_at'> & {
  id?: string;
};

// Tipos extendidos con relaciones
export interface ChatConversation extends ChatConversationRow {
  messages?: ChatMessage[];
  participants?: ChatParticipant[];
  product?: {
    id: string;
    name: string;
    image_url: string;
    price: number;
  };
  order?: {
    id: string;
    order_number: string;
    total: number;
    status: string;
  };
}

export interface ChatMessage extends ChatMessageRow {
  attachments_parsed?: ChatAttachment[];
  replied_to?: ChatMessage;
  reactions?: ChatReaction[];
}

export interface ChatAttachment extends ChatAttachmentRow {}

export interface ChatParticipant extends ChatParticipantRow {}

export interface ChatVideoCall extends ChatVideoCallRow {}

export interface ChatForm extends ChatFormRow {
  form_data_parsed?: any;
  responses_parsed?: any;
}

export interface ChatReaction extends ChatReactionRow {}

// Eventos de tiempo real
export type ChatEventType =
  | 'conversation.created'
  | 'conversation.updated'
  | 'message.created'
  | 'message.updated'
  | 'message.deleted'
  | 'message.read'
  | 'typing.start'
  | 'typing.stop'
  | 'participant.joined'
  | 'participant.left'
  | 'video_call.started'
  | 'video_call.answered'
  | 'video_call.ended';

export interface ChatEvent {
  type: ChatEventType;
  conversation_id: string;
  user_id?: string;
  user_type?: SenderType;
  data?: any;
  timestamp: string;
}

// Estado de escritura (typing indicator)
export interface TypingIndicator {
  conversation_id: string;
  user_id: string;
  user_name: string;
  user_type: SenderType;
  is_typing: boolean;
}

// Datos para crear conversación
export interface CreateConversationData {
  store_id: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  customer_id?: string;
  product_id?: string;
  initial_message?: string;
}

// Datos para enviar mensaje
export interface SendMessageData {
  conversation_id: string;
  sender_type: SenderType;
  sender_id?: string;
  sender_name: string;
  message_type: MessageType;
  content: string;
  attachments?: File[];
  replied_to_id?: string;
}

// Configuración de videollamada
export interface VideoCallConfig {
  conversation_id: string;
  initiated_by: 'customer' | 'store';
  initiator_id?: string;
  room_name?: string;
}

// Formulario de pedido
export interface OrderFormData {
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    price: number;
  }>;
  shipping_address?: {
    street: string;
    city: string;
    state: string;
    zip_code: string;
    country: string;
  };
  payment_method?: string;
  notes?: string;
}

// Formulario de cotización
export interface QuoteFormData {
  products: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
  }>;
  delivery_date?: string;
  special_requirements?: string;
  contact_phone: string;
  contact_email: string;
}

// Estadísticas de chat
export interface ChatStats {
  total_conversations: number;
  active_conversations: number;
  total_messages: number;
  unread_messages: number;
  average_response_time: number; // en minutos
  customer_satisfaction: number; // 1-5
}

// Filtros para buscar conversaciones
export interface ConversationFilters {
  store_id?: string;
  customer_id?: string;
  status?: ConversationStatus;
  priority?: ConversationPriority;
  has_unread?: boolean;
  product_id?: string;
  order_id?: string;
  search?: string; // buscar en nombre de cliente o último mensaje
  date_from?: string;
  date_to?: string;
}

// Opciones de paginación
export interface PaginationOptions {
  limit?: number;
  offset?: number;
  order_by?: 'created_at' | 'updated_at' | 'last_message_at';
  order_direction?: 'asc' | 'desc';
}
