/**
 * API Endpoint para enviar mensajes en el chat
 * POST /api/chat/send
 */

import { json } from '@solidjs/start';
import { APIEvent } from '@solidjs/start/server';
import { sendMessage } from '@/lib/chat-db';

export async function POST({ request }: APIEvent) {
  try {
    const body = await request.json();
    const { conversationId, message, senderId, senderName, senderType } = body;

    if (!conversationId || !message || !senderName || !senderType) {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Enviar mensaje a la base de datos
    const messageId = await sendMessage({
      conversation_id: conversationId,
      sender_type: senderType,
      sender_id: senderId,
      sender_name: senderName,
      message_type: 'text',
      content: message,
    });

    return json({
      success: true,
      message: {
        id: messageId,
        conversation_id: conversationId,
        sender_type: senderType,
        sender_id: senderId,
        sender_name: senderName,
        message_type: 'text',
        content: message,
        created_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return json(
      { error: 'Failed to send message', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
