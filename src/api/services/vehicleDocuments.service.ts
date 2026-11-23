import { z } from 'zod';
import type { DocumentKey } from '@/constants/onboarding';
import { newId } from '@/utils/id';
import { logger } from '@/utils/logger';
import { ENDPOINTS, STORAGE_PATHS } from '../endpoints';
import { ApiError } from '../errors';
import { restError } from '../rest';
import { parseOrThrow } from '../schemas/auth.schemas';
import { getSupabase } from '../supabase';
import { removeFile, uploadFile, type LocalFile } from './storage.service';
import type { CreatedVehicle } from './vehicle.service';

const { REST, STORAGE } = ENDPOINTS.SUPABASE;

/** Each document type's table (all files in bucket vehicle-docs). */
export const DOCUMENT_TABLES: Record<DocumentKey, string> = {
  rc: REST.VDOCS_RC,
  insurance: REST.VDOCS_INSURANCE,
  pollution: REST.VDOCS_POLLUTION,
  fastag: REST.VDOCS_FASTAG,
};

/** What vehicle-docs accepts (as the web). */
export const DOCUMENT_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const;
const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

/** The typed number(s) a document needs (the RC uses the vehicle number). */
export type DocumentNumbers = { policyNo?: string; insurer?: string; certificateNo?: string; fastagId?: string };

const required = (value: string | undefined, label: string) => {
  const v = value?.trim();
  if (!v) {
    throw new ApiError({ kind: 'validation', code: 'DOCUMENT_FIELD_REQUIRED', message: `${label} is required` });
  }
  return v;
};

/**
 * The vdocs row as the web builds it: `vehicle_id`, the required number(s), `registration_number` = the
 * vehicle number, `make_id / model_id / variant_id` on RC and insurance, and the file path.
 */
export function documentRow(
  key: DocumentKey,
  vehicle: CreatedVehicle,
  numbers: DocumentNumbers,
  documentPath: string,
): Record<string, string> {
  const base = { vehicle_id: vehicle.id, registration_number: vehicle.vehicleNumber, document_path: documentPath };
  const links = { make_id: vehicle.model.makeId, model_id: vehicle.model.modelId, variant_id: vehicle.model.variantId };
  switch (key) {
    case 'rc':
      return { ...base, ...links };
    case 'insurance':
      return {
        ...base,
        ...links,
        policy_no: required(numbers.policyNo, 'Policy number'),
        insurer: required(numbers.insurer, 'Insurer'),
      };
    case 'pollution':
      return { ...base, certificate_no: required(numbers.certificateNo, 'Certificate number') };
    case 'fastag':
      return { ...base, fastag_id: required(numbers.fastagId, 'FASTag ID') };
  }
}

const Created = z.object({ id: z.string() });

/**
 * Uploads the file to vehicle-docs/<uid>/<table>/<uuid>.<ext> and inserts the row. If the insert
 * fails, the uploaded file is removed (as the web does). Returns the new row id.
 */
export async function saveVehicleDocument(
  uid: string,
  key: DocumentKey,
  vehicle: CreatedVehicle,
  file: LocalFile,
  numbers: DocumentNumbers,
): Promise<string> {
  const table = DOCUMENT_TABLES[key];
  const ext = EXTENSIONS[file.mimeType];
  if (!ext) {
    throw new ApiError({ kind: 'validation', code: 'UNSUPPORTED_FILE', message: `Unsupported type ${file.mimeType}` });
  }
  // Validate before uploading anything.
  documentRow(key, vehicle, numbers, '');
  const path = await uploadFile(STORAGE.VEHICLE_DOCS, STORAGE_PATHS.vehicleDocument(uid, table, newId(), ext), file);
  const res = await getSupabase().from(table).insert(documentRow(key, vehicle, numbers, path)).select('id').single();
  if (res.error) {
    await removeFile(STORAGE.VEHICLE_DOCS, path).catch(e => logger.warn('orphan document file', { table, e: String(e) }));
    throw restError(res);
  }
  return parseOrThrow(Created, res.data, `${table} insert`).id;
}
