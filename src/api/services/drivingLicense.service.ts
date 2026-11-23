import { z } from 'zod';
import { ENDPOINTS, STORAGE_PATHS } from '../endpoints';
import { ApiError } from '../errors';
import { unwrap } from '../rest';
import { parseOrThrow } from '../schemas/auth.schemas';
import { getSupabase } from '../supabase';
import { getSignedUrl, uploadFile, type LocalFile } from './storage.service';

const { REST, STORAGE } = ENDPOINTS.SUPABASE;

/** What the `driving-licenses` bucket accepts (as the web's file input). */
export const DL_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const;

/** One row per user (unique user_id). issued_on / valid_upto / vehicle_classes aren't collected by the app. */
const DrivingLicenseRow = z.object({
  id: z.string(),
  user_id: z.string(),
  dl_number: z.string(),
  document_path: z.string().nullable().optional(),
});

export type DrivingLicense = { id: string; dlNumber: string; documentPath: string | null };

const toModel = (row: z.infer<typeof DrivingLicenseRow>): DrivingLicense => ({
  id: row.id,
  dlNumber: row.dl_number,
  documentPath: row.document_path || null,
});

export const normaliseDlNumber = (value: string) => value.trim().toUpperCase();

export async function fetchDrivingLicense(uid: string): Promise<DrivingLicense | null> {
  const res = unwrap(
    await getSupabase().from(REST.USER_DRIVING_LICENSES).select('*').eq('user_id', uid).maybeSingle(),
  );
  return res.data ? toModel(parseOrThrow(DrivingLicenseRow, res.data, 'user_driving_licenses')) : null;
}

/** Uploads the DL photo / PDF to `driving-licenses/<uid>/<timestamp>-<sanitised name>`; returns the path. */
export function uploadDrivingLicenseFile(uid: string, file: LocalFile, now: number = Date.now()): Promise<string> {
  if (!(DL_MIME_TYPES as readonly string[]).includes(file.mimeType)) {
    return Promise.reject(
      new ApiError({ kind: 'validation', code: 'UNSUPPORTED_FILE', message: `Unsupported type ${file.mimeType}` }),
    );
  }
  return uploadFile(STORAGE.DRIVING_LICENSES, STORAGE_PATHS.drivingLicense(uid, now, file.name), file);
}

/**
 * Upsert on user_id (one DL per user): `{ user_id, dl_number (trimmed, upper-case), document_path }`.
 * Both are required, as on the web.
 */
export async function saveDrivingLicense(
  uid: string,
  input: { dlNumber: string; documentPath: string | null },
): Promise<DrivingLicense> {
  const dlNumber = normaliseDlNumber(input.dlNumber);
  if (!dlNumber) {
    throw new ApiError({ kind: 'validation', code: 'DL_NUMBER_REQUIRED', message: 'Enter the licence number' });
  }
  if (!input.documentPath) {
    throw new ApiError({ kind: 'validation', code: 'DL_FILE_REQUIRED', message: 'Upload a photo or PDF of your licence' });
  }
  const res = unwrap(
    await getSupabase()
      .from(REST.USER_DRIVING_LICENSES)
      .upsert({ user_id: uid, dl_number: dlNumber, document_path: input.documentPath }, { onConflict: 'user_id' })
      .select('*')
      .single(),
  );
  return toModel(parseOrThrow(DrivingLicenseRow, res.data, 'user_driving_licenses upsert'));
}

export const drivingLicenseUrl = (path: string) => getSignedUrl(STORAGE.DRIVING_LICENSES, path);
