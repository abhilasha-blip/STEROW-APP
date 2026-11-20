import { z } from 'zod';
import { MAX_UPLOAD_BYTES } from '@/constants/onboarding';

/** What the onboarding upload cards accept (design: "JPEG, PNG, PDF. Upto 10 MB"). */
export const UPLOAD_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'] as const;
export type UploadMimeType = (typeof UPLOAD_MIME_TYPES)[number];

/** A validated local file attached to an upload card (nothing is uploaded yet). */
export const uploadedFileSchema = z.object({
  uri: z.string().min(1),
  name: z.string(),
  mimeType: z.enum(UPLOAD_MIME_TYPES),
  /** Bytes, when the picker reports it. */
  size: z.number().nonnegative().optional(),
});
export type UploadedFile = z.infer<typeof uploadedFileSchema>;

/** What the image / document pickers hand back (react-native-image-picker field names). */
export type RawPickedFile = {
  uri: string;
  fileName?: string | null;
  type?: string | null;
  fileSize?: number | null;
};

export type UploadValidationError = 'unsupported_type' | 'too_large';

const EXTENSION_TYPES: Record<string, UploadMimeType> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  pdf: 'application/pdf',
};

const extensionOf = (value?: string | null) => {
  const match = /\.([a-z0-9]+)(?:[?#].*)?$/i.exec(value ?? '');
  return match ? match[1].toLowerCase() : '';
};

/** The accepted MIME type of a picked file, from its reported type or else its extension; null if unsupported. */
export function resolveMimeType(file: RawPickedFile): UploadMimeType | null {
  const type = file.type?.toLowerCase().trim();
  if (type) {
    if (type === 'image/jpg') {
      return 'image/jpeg';
    }
    return (UPLOAD_MIME_TYPES as readonly string[]).includes(type) ? (type as UploadMimeType) : null;
  }
  return EXTENSION_TYPES[extensionOf(file.fileName) || extensionOf(file.uri)] ?? null;
}

/** Type (jpg/png/pdf) and size (≤ 10 MB) check for anything picked into an upload card. */
export function validateUpload(
  file: RawPickedFile,
): { ok: true; file: UploadedFile } | { ok: false; error: UploadValidationError } {
  const mimeType = resolveMimeType(file);
  if (!mimeType) {
    return { ok: false, error: 'unsupported_type' };
  }
  if (typeof file.fileSize === 'number' && file.fileSize > MAX_UPLOAD_BYTES) {
    return { ok: false, error: 'too_large' };
  }
  const name = file.fileName || file.uri.split('/').pop() || '';
  return {
    ok: true,
    file: {
      uri: file.uri,
      name: decodeURIComponentSafe(name),
      mimeType,
      ...(typeof file.fileSize === 'number' && { size: file.fileSize }),
    },
  };
}

export const isPdf = (file: Pick<UploadedFile, 'mimeType'>) => file.mimeType === 'application/pdf';

/** "820 KB", "1.4 MB" (1 KB = 1024 bytes, like the 10 MB limit). */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

function decodeURIComponentSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
