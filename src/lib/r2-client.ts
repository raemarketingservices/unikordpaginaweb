/**
 * Cliente para Cloudflare R2 Storage
 * Para almacenar archivos del chat: imágenes, videos, documentos
 */

export interface R2UploadOptions {
  bucket: string;
  key: string;
  file: File | Blob;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface R2UploadResult {
  success: boolean;
  url: string;
  key: string;
  size: number;
  contentType: string;
  etag?: string;
}

export interface R2DeleteOptions {
  bucket: string;
  key: string;
}

/**
 * Cliente para interactuar con Cloudflare R2
 */
export class R2Client {
  private bucket: R2Bucket;
  private publicUrl: string;

  constructor(bucket: R2Bucket, publicUrl: string) {
    this.bucket = bucket;
    this.publicUrl = publicUrl;
  }

  /**
   * Sube un archivo a R2
   */
  async upload(options: Omit<R2UploadOptions, 'bucket'>): Promise<R2UploadResult> {
    const { key, file, contentType, metadata } = options;

    // Convertir File/Blob a ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Subir a R2
    const object = await this.bucket.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: contentType || file.type,
      },
      customMetadata: metadata,
    });

    return {
      success: true,
      url: `${this.publicUrl}/${key}`,
      key: key,
      size: arrayBuffer.byteLength,
      contentType: contentType || file.type,
      etag: object.etag,
    };
  }

  /**
   * Obtiene un archivo de R2
   */
  async get(key: string): Promise<R2ObjectBody | null> {
    return await this.bucket.get(key);
  }

  /**
   * Elimina un archivo de R2
   */
  async delete(key: string): Promise<void> {
    await this.bucket.delete(key);
  }

  /**
   * Lista archivos con un prefijo
   */
  async list(prefix?: string, limit: number = 1000): Promise<R2Objects> {
    return await this.bucket.list({
      prefix,
      limit,
    });
  }

  /**
   * Obtiene la URL pública de un archivo
   */
  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }

  /**
   * Genera un nombre de archivo único
   */
  static generateKey(
    folder: string,
    originalName: string,
    prefix?: string
  ): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split('.').pop();
    const baseName = originalName.split('.').slice(0, -1).join('.');
    const safeName = baseName.replace(/[^a-z0-9]/gi, '-').toLowerCase();

    const fileName = prefix
      ? `${prefix}-${timestamp}-${random}.${extension}`
      : `${safeName}-${timestamp}-${random}.${extension}`;

    return `${folder}/${fileName}`;
  }
}

/**
 * Helpers para el chat
 */

export interface ChatFileUpload {
  conversationId: string;
  messageId: string;
  file: File;
  uploadedBy: 'customer' | 'store';
}

/**
 * Sube un archivo del chat a R2
 */
export async function uploadChatFile(
  r2: R2Client,
  data: ChatFileUpload
): Promise<R2UploadResult> {
  const { conversationId, messageId, file, uploadedBy } = data;

  // Generar key único
  const folder = `chat/${conversationId}`;
  const key = R2Client.generateKey(folder, file.name, messageId);

  // Metadata
  const metadata = {
    conversationId,
    messageId,
    uploadedBy,
    originalName: file.name,
    uploadedAt: new Date().toISOString(),
  };

  // Subir
  return await r2.upload({
    key,
    file,
    contentType: file.type,
    metadata,
  });
}

/**
 * Tipos de archivo soportados
 */
export const ALLOWED_FILE_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  videos: ['video/mp4', 'video/webm', 'video/quicktime'],
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
};

/**
 * Valida el tipo de archivo
 */
export function isFileTypeAllowed(mimeType: string): boolean {
  return [
    ...ALLOWED_FILE_TYPES.images,
    ...ALLOWED_FILE_TYPES.videos,
    ...ALLOWED_FILE_TYPES.documents,
    ...ALLOWED_FILE_TYPES.audio,
  ].includes(mimeType);
}

/**
 * Obtiene el tipo de archivo (imagen, video, documento)
 */
export function getFileCategory(mimeType: string): 'image' | 'video' | 'audio' | 'document' | 'other' {
  if (ALLOWED_FILE_TYPES.images.includes(mimeType)) return 'image';
  if (ALLOWED_FILE_TYPES.videos.includes(mimeType)) return 'video';
  if (ALLOWED_FILE_TYPES.audio.includes(mimeType)) return 'audio';
  if (ALLOWED_FILE_TYPES.documents.includes(mimeType)) return 'document';
  return 'other';
}

/**
 * Valida el tamaño del archivo
 */
export function isFileSizeValid(size: number, maxSizeMB: number = 10): boolean {
  const maxBytes = maxSizeMB * 1024 * 1024;
  return size <= maxBytes;
}

/**
 * Formatea el tamaño del archivo
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Genera thumbnail para imágenes (en el cliente)
 */
export async function generateThumbnail(
  file: File,
  maxWidth: number = 300,
  maxHeight: number = 300
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calcular dimensiones manteniendo aspecto
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to generate thumbnail'));
          },
          'image/jpeg',
          0.8
        );
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Comprime una imagen antes de subirla
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to compress image'));
          },
          file.type,
          quality
        );
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
