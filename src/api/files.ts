import { ApiError } from './errors';

/**
 * Bytes of a local file (picker `file://` / `content://` uri, or a bundled asset uri) for a Storage
 * upload. React Native's fetch reads local uris; supabase-js uploads an ArrayBuffer as-is.
 */
export async function readLocalFile(uri: string): Promise<ArrayBuffer> {
  try {
    const response = await fetch(uri);
    return await response.arrayBuffer();
  } catch (e) {
    throw new ApiError({ kind: 'unknown', code: 'FILE_UNREADABLE', message: 'Could not read the file', raw: e });
  }
}
