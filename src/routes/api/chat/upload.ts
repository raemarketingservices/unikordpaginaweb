/**
 * API Endpoint para subir archivos del chat a Cloudflare R2
 */

import { json } from '@solidjs/start';
import { APIEvent } from '@solidjs/start/server';
import { R2Client, uploadChatFile, isFileTypeAllowed, isFileSizeValid, getFileCategory } from '@/lib/r2-client';

const MAX_FILE_SIZE_MB = 10; // 10 MB por archivo

export async function POST({ request, env }: APIEvent) {
  try {
    // Obtener el bucket R2 desde el env de Cloudflare Workers
    const bucket = (env as any).CHAT_FILES as R2Bucket;
    if (!bucket) {
      return json({ error: 'R2 bucket not configured' }, { status: 500 });
    }

    // Obtener la URL pública del bucket
    const publicUrl = (env as any).R2_PUBLIC_URL || 'https://files.uniko-rd.com';

    // Crear cliente R2
    const r2Client = new R2Client(bucket, publicUrl);

    // Parsear el FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const conversationId = formData.get('conversationId') as string;
    const messageId = formData.get('messageId') as string;
    const uploadedBy = formData.get('uploadedBy') as 'customer' | 'store';

    // Validaciones
    if (!file) {
      return json({ error: 'No file provided' }, { status: 400 });
    }

    if (!conversationId || !messageId) {
      return json({ error: 'Missing conversationId or messageId' }, { status: 400 });
    }

    // Validar tipo de archivo
    if (!isFileTypeAllowed(file.type)) {
      return json({ error: 'File type not allowed' }, { status: 400 });
    }

    // Validar tamaño
    if (!isFileSizeValid(file.size, MAX_FILE_SIZE_MB)) {
      return json({ error: `File too large. Max size: ${MAX_FILE_SIZE_MB}MB` }, { status: 400 });
    }

    // Subir archivo
    const result = await uploadChatFile(r2Client, {
      conversationId,
      messageId,
      file,
      uploadedBy,
    });

    // Responder con éxito
    return json({
      success: true,
      file: {
        url: result.url,
        key: result.key,
        size: result.size,
        contentType: result.contentType,
        category: getFileCategory(result.contentType),
      },
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return json(
      { error: 'Failed to upload file', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE({ request, env }: APIEvent) {
  try {
    const bucket = (env as any).CHAT_FILES as R2Bucket;
    if (!bucket) {
      return json({ error: 'R2 bucket not configured' }, { status: 500 });
    }

    const publicUrl = (env as any).R2_PUBLIC_URL || 'https://files.uniko-rd.com';
    const r2Client = new R2Client(bucket, publicUrl);

    const { key } = await request.json();

    if (!key) {
      return json({ error: 'No key provided' }, { status: 400 });
    }

    await r2Client.delete(key);

    return json({ success: true, message: 'File deleted' });
  } catch (error) {
    console.error('Error deleting file:', error);
    return json(
      { error: 'Failed to delete file', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
