-- Sistema de Chat en Tiempo Real para UNIKO-RD
-- Permite comunicación directa entre tiendas y clientes

-- Tabla de conversaciones
CREATE TABLE IF NOT EXISTS chat_conversations (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_id TEXT, -- NULL si es cliente anónimo
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,

  -- Contexto
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,

  -- Estado
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  -- Último mensaje
  last_message TEXT,
  last_message_at TIMESTAMP,
  last_message_from TEXT, -- 'customer' o 'store'

  -- Contador de mensajes no leídos
  unread_count_customer INTEGER DEFAULT 0,
  unread_count_store INTEGER DEFAULT 0,

  -- Metadata
  tags TEXT, -- JSON array de tags
  notes TEXT, -- Notas internas de la tienda

  -- Videollamada
  video_call_active BOOLEAN DEFAULT FALSE,
  video_call_room_id TEXT,
  video_call_started_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP
);

-- Tabla de mensajes
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,

  -- Remitente
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'store', 'system')),
  sender_id TEXT, -- User ID si está autenticado
  sender_name TEXT NOT NULL,

  -- Contenido
  message_type TEXT NOT NULL CHECK (message_type IN ('text', 'image', 'video', 'audio', 'file', 'product', 'order', 'form', 'system')),
  content TEXT NOT NULL, -- Texto o JSON según el tipo

  -- Archivos adjuntos
  attachments TEXT, -- JSON array de archivos

  -- Metadata
  replied_to_id TEXT REFERENCES chat_messages(id) ON DELETE SET NULL,
  edited BOOLEAN DEFAULT FALSE,
  deleted BOOLEAN DEFAULT FALSE,

  -- Estado de lectura
  read_by_customer BOOLEAN DEFAULT FALSE,
  read_by_store BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de archivos adjuntos
CREATE TABLE IF NOT EXISTS chat_attachments (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,

  -- Información del archivo
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video', 'audio', 'document', 'other')),
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL, -- en bytes
  mime_type TEXT NOT NULL,

  -- Storage
  storage_url TEXT NOT NULL, -- URL de Supabase Storage
  thumbnail_url TEXT, -- Para imágenes y videos

  -- Metadata
  width INTEGER, -- Para imágenes/videos
  height INTEGER,
  duration INTEGER, -- Para videos/audio (en segundos)

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de participantes (para chat grupal futuro)
CREATE TABLE IF NOT EXISTS chat_participants (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('customer', 'store_owner', 'store_admin', 'support')),

  -- Permisos
  can_send_messages BOOLEAN DEFAULT TRUE,
  can_send_media BOOLEAN DEFAULT TRUE,
  can_start_video_call BOOLEAN DEFAULT TRUE,

  -- Estado
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  left_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,

  -- Última actividad
  last_seen_at TIMESTAMP,
  last_read_message_id TEXT REFERENCES chat_messages(id) ON DELETE SET NULL
);

-- Tabla de videollamadas
CREATE TABLE IF NOT EXISTS chat_video_calls (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,

  -- Información de la llamada
  room_id TEXT NOT NULL UNIQUE,
  room_url TEXT NOT NULL,

  -- Participantes
  initiated_by TEXT NOT NULL, -- 'customer' o 'store'
  initiator_id TEXT,

  -- Estado
  status TEXT DEFAULT 'ringing' CHECK (status IN ('ringing', 'active', 'ended', 'missed', 'rejected')),

  -- Tiempos
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  answered_at TIMESTAMP,
  ended_at TIMESTAMP,
  duration INTEGER, -- en segundos

  -- Metadata
  recording_url TEXT, -- Si se grabó la llamada
  quality_rating INTEGER, -- 1-5

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de formularios compartidos
CREATE TABLE IF NOT EXISTS chat_forms (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,

  -- Tipo de formulario
  form_type TEXT NOT NULL CHECK (form_type IN ('order', 'quote', 'contact', 'feedback', 'custom')),
  form_data TEXT NOT NULL, -- JSON con los campos del formulario

  -- Estado
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'filled', 'submitted', 'expired')),

  -- Respuestas
  filled_by TEXT, -- 'customer' o 'store'
  filled_at TIMESTAMP,
  responses TEXT, -- JSON con las respuestas

  -- Expiración
  expires_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de reacciones a mensajes
CREATE TABLE IF NOT EXISTS chat_reactions (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('customer', 'store')),

  -- Tipo de reacción
  reaction TEXT NOT NULL, -- emoji o tipo

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(message_id, user_id)
);

-- Tabla de mensajes programados
CREATE TABLE IF NOT EXISTS chat_scheduled_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,

  -- Contenido
  message_type TEXT NOT NULL,
  content TEXT NOT NULL,
  attachments TEXT,

  -- Programación
  scheduled_for TIMESTAMP NOT NULL,
  sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_chat_conversations_store ON chat_conversations(store_id, status);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_customer ON chat_conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_product ON chat_conversations(product_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_updated ON chat_conversations(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread_customer ON chat_messages(conversation_id, read_by_customer) WHERE read_by_customer = FALSE;
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread_store ON chat_messages(conversation_id, read_by_store) WHERE read_by_store = FALSE;

CREATE INDEX IF NOT EXISTS idx_chat_attachments_conversation ON chat_attachments(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_attachments_message ON chat_attachments(message_id);

CREATE INDEX IF NOT EXISTS idx_chat_participants_conversation ON chat_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON chat_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_chat_video_calls_conversation ON chat_video_calls(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_video_calls_status ON chat_video_calls(status);

-- Triggers para actualizar updated_at
CREATE TRIGGER IF NOT EXISTS update_chat_conversations_updated_at
AFTER UPDATE ON chat_conversations
BEGIN
  UPDATE chat_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_chat_messages_updated_at
AFTER UPDATE ON chat_messages
BEGIN
  UPDATE chat_messages SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger para actualizar último mensaje en conversación
CREATE TRIGGER IF NOT EXISTS update_conversation_last_message
AFTER INSERT ON chat_messages
BEGIN
  UPDATE chat_conversations
  SET
    last_message = NEW.content,
    last_message_at = NEW.created_at,
    last_message_from = NEW.sender_type,
    unread_count_customer = CASE WHEN NEW.sender_type = 'store' THEN unread_count_customer + 1 ELSE unread_count_customer END,
    unread_count_store = CASE WHEN NEW.sender_type = 'customer' THEN unread_count_store + 1 ELSE unread_count_store END
  WHERE id = NEW.conversation_id;
END;

-- Trigger para decrementar contador de no leídos
CREATE TRIGGER IF NOT EXISTS update_conversation_read_count
AFTER UPDATE OF read_by_customer, read_by_store ON chat_messages
BEGIN
  UPDATE chat_conversations
  SET
    unread_count_customer = (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = NEW.conversation_id AND read_by_customer = FALSE AND sender_type = 'store'),
    unread_count_store = (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = NEW.conversation_id AND read_by_store = FALSE AND sender_type = 'customer')
  WHERE id = NEW.conversation_id;
END;
