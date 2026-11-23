import { z } from 'zod';
import { readLocalFile } from '../files';
import { ApiError } from '../errors';
import { restError } from '../rest';
import { parseOrThrow } from '../schemas/auth.schemas';
import { getSupabase } from '../supabase';

/** A local file to upload. */
export type LocalFile = { uri: string; mimeType: string; name: string };

/** Signed URLs live 1 h (as on the web); reused until a minute before they expire. */
export const SIGNED_URL_TTL_S = 3600;
const SIGNED_URL_MARGIN_MS = 60_000;

const Uploaded = z.object({ path: z.string().min(1) });
const Signed = z.object({ signedUrl: z.url() });

const cache = new Map<string, { url: string; expiresAt: number }>();
const key = (bucket: string, path: string) => `${bucket}/${path}`;

/** Status for errors from storage-js (StorageApiError has `status`; older builds `statusCode`). */
function storageError(error: { message: string } & object): ApiError {
  const e = error as { status?: unknown; statusCode?: unknown };
  const status = typeof e.status === 'number' ? e.status : Number(e.statusCode) || 500;
  return restError({ error, status });
}

/** Uploads to `<bucket>/<path>` (upsert, so a retry with the same path succeeds); returns the path. */
export async function uploadFile(bucket: string, path: string, file: LocalFile): Promise<string> {
  const body = await readLocalFile(file.uri);
  const { data, error } = await getSupabase()
    .storage.from(bucket)
    .upload(path, body, { contentType: file.mimeType, upsert: true });
  if (error) {
    throw storageError(error);
  }
  cache.delete(key(bucket, path));
  return parseOrThrow(Uploaded, data, `storage upload ${bucket}`).path;
}

/** Removes an object (best-effort cleanup after a failed save). */
export async function removeFile(bucket: string, path: string): Promise<void> {
  cache.delete(key(bucket, path));
  const { error } = await getSupabase().storage.from(bucket).remove([path]);
  if (error) {
    throw storageError(error);
  }
}

/** A temporary URL to display a private object, cached until shortly before it expires. */
export async function getSignedUrl(bucket: string, path: string, now: () => number = Date.now): Promise<string> {
  const hit = cache.get(key(bucket, path));
  if (hit && hit.expiresAt - SIGNED_URL_MARGIN_MS > now()) {
    return hit.url;
  }
  const { data, error } = await getSupabase().storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL_S);
  if (error) {
    throw storageError(error);
  }
  const url = parseOrThrow(Signed, data, `storage sign ${bucket}`).signedUrl;
  cache.set(key(bucket, path), { url, expiresAt: now() + SIGNED_URL_TTL_S * 1000 });
  return url;
}

/** Test-only. */
export function __clearSignedUrlCache(): void {
  cache.clear();
}
