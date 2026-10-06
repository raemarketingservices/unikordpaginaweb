/**
 * API Endpoint para verificar nuevos mensajes en una conversación
 * GET /api/chat/messages/:conversationId/new?after=messageId
 */

import { json } from '@solidjs/start';
import { APIEvent } from '@solidjs/start/server';
import { getMessages } from '@/lib/chat-db';

export async function GET({ params, request }: APIEvent) {
  try {
    const conversationId = params.conversationId;
    const url = new URL(request.url);
    const afterMessageId = url.searchParams.get('after');

    if (!conversationId) {
      return json({ error: 'Conversation ID required' }, { status: 400 });
    }

    // Obtener mensajes de la conversación
    const messages = await getMessages(conversationId, 50);

    // Filtrar solo los mensajes después del ID proporcionado
    let newMessages = messages;
    if (afterMessageId) {
      const afterIndex = messages.findIndex(m => m.id === afterMessageId);
      if (afterIndex !== -1) {
        newMessages = messages.slice(0, afterIndex);
      }
    }

    return json({
      success: true,
      messages: newMessages,
      count: newMessages.length,
    });
  } catch (error) {
    console.error('Error fetching new messages:', error);
    return json(
      { error: 'Failed to fetch messages', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
