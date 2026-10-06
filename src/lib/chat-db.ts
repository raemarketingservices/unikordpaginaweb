import { getLocalDB } from './local-db';
import type {
  ChatConversationRow,
  ChatConversationInsert,
  ChatMessageRow,
  ChatMessageInsert,
  ChatAttachmentRow,
  ChatAttachmentInsert,
  ChatConversation,
  ChatMessage,
  ConversationFilters,
  PaginationOptions,
  CreateConversationData,
  SendMessageData,
  ChatStats,
} from './chat-types';

/**
 * Conversaciones
 */
export async function createConversation(data: CreateConversationData): Promise<string> {
  const db = await getLocalDB();
  const id = crypto.randomUUID();

  await db.execute({
    sql: `
      INSERT INTO chat_conversations (
        id, store_id, customer_id, customer_name, customer_phone, customer_email,
        product_id, status, priority
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', 'normal')
    `,
    args: [
      id,
      data.store_id,
      data.customer_id || null,
      data.customer_name,
      data.customer_phone || null,
      data.customer_email || null,
      data.product_id || null,
    ],
  });

  // Si hay mensaje inicial, crearlo
  if (data.initial_message) {
    await sendMessage({
      conversation_id: id,
      sender_type: 'customer',
      sender_name: data.customer_name,
      sender_id: data.customer_id,
      message_type: 'text',
      content: data.initial_message,
    });
  }

  return id;
}

export async function getConversation(conversationId: string): Promise<ChatConversation | null> {
  const db = await getLocalDB();
  const result = await db.execute({
    sql: 'SELECT * FROM chat_conversations WHERE id = ?',
    args: [conversationId],
  });

  return result.rows[0] as ChatConversation | null;
}

export async function listConversations(
  filters: ConversationFilters = {},
  pagination: PaginationOptions = {}
): Promise<ChatConversation[]> {
  const db = await getLocalDB();

  const {
    limit = 50,
    offset = 0,
    order_by = 'updated_at',
    order_direction = 'desc',
  } = pagination;

  let sql = 'SELECT * FROM chat_conversations WHERE 1=1';
  const args: any[] = [];

  if (filters.store_id) {
    sql += ' AND store_id = ?';
    args.push(filters.store_id);
  }

  if (filters.customer_id) {
    sql += ' AND customer_id = ?';
    args.push(filters.customer_id);
  }

  if (filters.status) {
    sql += ' AND status = ?';
    args.push(filters.status);
  }

  if (filters.priority) {
    sql += ' AND priority = ?';
    args.push(filters.priority);
  }

  if (filters.has_unread) {
    sql += ' AND unread_count_store > 0';
  }

  if (filters.product_id) {
    sql += ' AND product_id = ?';
    args.push(filters.product_id);
  }

  if (filters.order_id) {
    sql += ' AND order_id = ?';
    args.push(filters.order_id);
  }

  if (filters.search) {
    sql += ' AND (customer_name LIKE ? OR last_message LIKE ?)';
    const searchTerm = `%${filters.search}%`;
    args.push(searchTerm, searchTerm);
  }

  if (filters.date_from) {
    sql += ' AND created_at >= ?';
    args.push(filters.date_from);
  }

  if (filters.date_to) {
    sql += ' AND created_at <= ?';
    args.push(filters.date_to);
  }

  sql += ` ORDER BY ${order_by} ${order_direction.toUpperCase()}`;
  sql += ' LIMIT ? OFFSET ?';
  args.push(limit, offset);

  const result = await db.execute({ sql, args });
  return result.rows as ChatConversation[];
}

export async function updateConversation(
  conversationId: string,
  updates: Partial<ChatConversationInsert>
): Promise<void> {
  const db = await getLocalDB();
  const fields = Object.keys(updates);
  const values = Object.values(updates);

  if (fields.length === 0) return;

  const setClause = fields.map((f) => `${f} = ?`).join(', ');

  await db.execute({
    sql: `UPDATE chat_conversations SET ${setClause} WHERE id = ?`,
    args: [...values, conversationId],
  });
}

export async function closeConversation(conversationId: string): Promise<void> {
  await updateConversation(conversationId, {
    status: 'closed',
    closed_at: new Date().toISOString(),
  });
}

export async function markConversationAsRead(
  conversationId: string,
  readerType: 'customer' | 'store'
): Promise<void> {
  const db = await getLocalDB();

  // Marcar todos los mensajes como leídos
  const readField = readerType === 'customer' ? 'read_by_customer' : 'read_by_store';

  await db.execute({
    sql: `UPDATE chat_messages SET ${readField} = TRUE, read_at = CURRENT_TIMESTAMP WHERE conversation_id = ? AND ${readField} = FALSE`,
    args: [conversationId],
  });

  // Resetear contador
  const countField = readerType === 'customer' ? 'unread_count_customer' : 'unread_count_store';

  await db.execute({
    sql: `UPDATE chat_conversations SET ${countField} = 0 WHERE id = ?`,
    args: [conversationId],
  });
}

/**
 * Mensajes
 */
export async function sendMessage(data: SendMessageData): Promise<string> {
  const db = await getLocalDB();
  const id = crypto.randomUUID();

  const attachmentsJson = data.attachments && data.attachments.length > 0
    ? JSON.stringify(data.attachments.map(f => ({ name: f.name, size: f.size, type: f.type })))
    : null;

  await db.execute({
    sql: `
      INSERT INTO chat_messages (
        id, conversation_id, sender_type, sender_id, sender_name,
        message_type, content, attachments, replied_to_id,
        read_by_customer, read_by_store
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      id,
      data.conversation_id,
      data.sender_type,
      data.sender_id || null,
      data.sender_name,
      data.message_type,
      data.content,
      attachmentsJson,
      data.replied_to_id || null,
      data.sender_type === 'customer', // Auto-read por quien envía
      data.sender_type === 'store',
    ],
  });

  return id;
}

export async function getMessages(
  conversationId: string,
  limit: number = 50,
  before?: string
): Promise<ChatMessage[]> {
  const db = await getLocalDB();

  let sql = 'SELECT * FROM chat_messages WHERE conversation_id = ?';
  const args: any[] = [conversationId];

  if (before) {
    sql += ' AND created_at < (SELECT created_at FROM chat_messages WHERE id = ?)';
    args.push(before);
  }

  sql += ' ORDER BY created_at DESC LIMIT ?';
  args.push(limit);

  const result = await db.execute({ sql, args });
  const messages = result.rows as ChatMessage[];

  // Parsear attachments JSON
  return messages.map(msg => ({
    ...msg,
    attachments_parsed: msg.attachments ? JSON.parse(msg.attachments) : [],
  }));
}

export async function updateMessage(
  messageId: string,
  updates: Partial<ChatMessageInsert>
): Promise<void> {
  const db = await getLocalDB();
  const fields = Object.keys(updates);
  const values = Object.values(updates);

  if (fields.length === 0) return;

  const setClause = fields.map((f) => `${f} = ?`).join(', ');

  await db.execute({
    sql: `UPDATE chat_messages SET ${setClause}, edited = TRUE WHERE id = ?`,
    args: [...values, messageId],
  });
}

export async function deleteMessage(messageId: string): Promise<void> {
  const db = await getLocalDB();
  await db.execute({
    sql: 'UPDATE chat_messages SET deleted = TRUE, content = "[Mensaje eliminado]" WHERE id = ?',
    args: [messageId],
  });
}

export async function markMessageAsRead(
  messageId: string,
  readerType: 'customer' | 'store'
): Promise<void> {
  const db = await getLocalDB();
  const readField = readerType === 'customer' ? 'read_by_customer' : 'read_by_store';

  await db.execute({
    sql: `UPDATE chat_messages SET ${readField} = TRUE, read_at = CURRENT_TIMESTAMP WHERE id = ?`,
    args: [messageId],
  });
}

/**
 * Archivos adjuntos
 */
export async function createAttachment(data: ChatAttachmentInsert): Promise<string> {
  const db = await getLocalDB();
  const id = data.id || crypto.randomUUID();

  await db.execute({
    sql: `
      INSERT INTO chat_attachments (
        id, conversation_id, message_id, file_type, file_name, file_size,
        mime_type, storage_url, thumbnail_url, width, height, duration
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      id,
      data.conversation_id,
      data.message_id,
      data.file_type,
      data.file_name,
      data.file_size,
      data.mime_type,
      data.storage_url,
      data.thumbnail_url || null,
      data.width || null,
      data.height || null,
      data.duration || null,
    ],
  });

  return id;
}

export async function getAttachments(messageId: string): Promise<ChatAttachmentRow[]> {
  const db = await getLocalDB();
  const result = await db.execute({
    sql: 'SELECT * FROM chat_attachments WHERE message_id = ? ORDER BY created_at',
    args: [messageId],
  });
  return result.rows as ChatAttachmentRow[];
}

export async function getConversationAttachments(
  conversationId: string,
  fileType?: string
): Promise<ChatAttachmentRow[]> {
  const db = await getLocalDB();

  let sql = 'SELECT * FROM chat_attachments WHERE conversation_id = ?';
  const args: any[] = [conversationId];

  if (fileType) {
    sql += ' AND file_type = ?';
    args.push(fileType);
  }

  sql += ' ORDER BY created_at DESC';

  const result = await db.execute({ sql, args });
  return result.rows as ChatAttachmentRow[];
}

/**
 * Estadísticas
 */
export async function getChatStats(storeId: string): Promise<ChatStats> {
  const db = await getLocalDB();

  // Total de conversaciones
  const totalResult = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM chat_conversations WHERE store_id = ?',
    args: [storeId],
  });

  // Conversaciones activas
  const activeResult = await db.execute({
    sql: "SELECT COUNT(*) as count FROM chat_conversations WHERE store_id = ? AND status = 'active'",
    args: [storeId],
  });

  // Total de mensajes
  const messagesResult = await db.execute({
    sql: `
      SELECT COUNT(*) as count
      FROM chat_messages cm
      JOIN chat_conversations cc ON cm.conversation_id = cc.id
      WHERE cc.store_id = ?
    `,
    args: [storeId],
  });

  // Mensajes no leídos
  const unreadResult = await db.execute({
    sql: `
      SELECT COUNT(*) as count
      FROM chat_messages cm
      JOIN chat_conversations cc ON cm.conversation_id = cc.id
      WHERE cc.store_id = ? AND cm.read_by_store = FALSE AND cm.sender_type = 'customer'
    `,
    args: [storeId],
  });

  // Tiempo promedio de respuesta (simplificado)
  const responseTimeResult = await db.execute({
    sql: `
      SELECT AVG(
        (julianday(store_msg.created_at) - julianday(customer_msg.created_at)) * 24 * 60
      ) as avg_minutes
      FROM chat_messages customer_msg
      JOIN chat_messages store_msg ON store_msg.conversation_id = customer_msg.conversation_id
      JOIN chat_conversations cc ON cc.id = customer_msg.conversation_id
      WHERE cc.store_id = ?
        AND customer_msg.sender_type = 'customer'
        AND store_msg.sender_type = 'store'
        AND store_msg.created_at > customer_msg.created_at
        AND customer_msg.created_at > datetime('now', '-7 days')
    `,
    args: [storeId],
  });

  return {
    total_conversations: Number((totalResult.rows[0] as any)?.count || 0),
    active_conversations: Number((activeResult.rows[0] as any)?.count || 0),
    total_messages: Number((messagesResult.rows[0] as any)?.count || 0),
    unread_messages: Number((unreadResult.rows[0] as any)?.count || 0),
    average_response_time: Number((responseTimeResult.rows[0] as any)?.avg_minutes || 0),
    customer_satisfaction: 4.5, // TODO: implementar sistema de calificación
  };
}

/**
 * Buscar conversaciones
 */
export async function searchConversations(
  storeId: string,
  query: string,
  limit: number = 20
): Promise<ChatConversation[]> {
  const db = await getLocalDB();

  const result = await db.execute({
    sql: `
      SELECT DISTINCT c.*
      FROM chat_conversations c
      LEFT JOIN chat_messages m ON m.conversation_id = c.id
      WHERE c.store_id = ?
        AND (
          c.customer_name LIKE ?
          OR c.customer_phone LIKE ?
          OR c.customer_email LIKE ?
          OR m.content LIKE ?
        )
      ORDER BY c.updated_at DESC
      LIMIT ?
    `,
    args: [storeId, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, limit],
  });

  return result.rows as ChatConversation[];
}

/**
 * Obtener conversaciones de un cliente
 */
export async function getCustomerConversations(
  customerId: string,
  storeId?: string
): Promise<ChatConversation[]> {
  const db = await getLocalDB();

  let sql = 'SELECT * FROM chat_conversations WHERE customer_id = ?';
  const args: any[] = [customerId];

  if (storeId) {
    sql += ' AND store_id = ?';
    args.push(storeId);
  }

  sql += ' ORDER BY updated_at DESC';

  const result = await db.execute({ sql, args });
  return result.rows as ChatConversation[];
}

/**
 * Obtener o crear conversación entre cliente y tienda
 */
export async function getOrCreateConversation(
  storeId: string,
  customerData: {
    customer_id?: string;
    customer_name: string;
    customer_phone?: string;
    customer_email?: string;
  },
  productId?: string
): Promise<string> {
  const db = await getLocalDB();

  // Buscar conversación activa existente
  let sql = "SELECT id FROM chat_conversations WHERE store_id = ? AND status = 'active'";
  const args: any[] = [storeId];

  if (customerData.customer_id) {
    sql += ' AND customer_id = ?';
    args.push(customerData.customer_id);
  } else if (customerData.customer_phone) {
    sql += ' AND customer_phone = ?';
    args.push(customerData.customer_phone);
  } else if (customerData.customer_email) {
    sql += ' AND customer_email = ?';
    args.push(customerData.customer_email);
  }

  if (productId) {
    sql += ' AND product_id = ?';
    args.push(productId);
  }

  sql += ' LIMIT 1';

  const result = await db.execute({ sql, args });

  if (result.rows.length > 0) {
    return (result.rows[0] as any).id;
  }

  // Crear nueva conversación
  return createConversation({
    store_id: storeId,
    customer_id: customerData.customer_id,
    customer_name: customerData.customer_name,
    customer_phone: customerData.customer_phone,
    customer_email: customerData.customer_email,
    product_id: productId,
  });
}
