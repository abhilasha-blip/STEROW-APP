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
import type { VehicleDetails, VehicleRef } from './vehicle.service';

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

/**
 * A document's typed details (the "Add Manually" form). Required per type (database NOT NULL / web rule):
 * RC → registration number (defaults to the vehicle number); Insurance → policy number + insurer;
 * Pollution → certificate number; FASTag → FASTag ID. `expiry` ("YYYY-MM-DD") is the insurance end date /
 * the PUC validity.
 */
export type DocumentFields = {
  registrationNumber?: string;
  policyNo?: string;
  insurer?: string;
  certificateNo?: string;
  fastagId?: string;
  expiry?: string | null;
  /** RC "Add Manually" (Your Vehicle details): the make / model / variant, fuel and colour on the RC. */
  vehicle?: VehicleDetails;
  /** RC "Add Manually": dates, address, body type, chassis / engine no., seating, weights. */
  rc?: RcDetails;
};
/**
 * RC "Add Manually": the vdocs_regcertificate columns beyond the vehicle (web form). Strings as typed;
 * empty → left out. Dates "YYYY-MM-DD".
 */
export type RcDetails = {
  regDate?: string | null;
  validUpto?: string | null;
  address?: string;
  bodyType?: string | null;
  chassisNumber?: string;
  engineNumber?: string;
  seatingCapacity?: string;
  grossWeight?: string;
  unladenWeight?: string;
};

/** Body types the web offers for the RC. */
export const RC_BODY_TYPES = [
  'Hatchback',
  'Sedan',
  'SUV',
  'MUV/MPV',
  'Coupe',
  'Convertible',
  'Wagon/Estate',
  'Pickup Truck',
  'Van',
] as const;

/** The filled RC columns (seating capacity an integer ≥ 1, weights numbers ≥ 0; others dropped). */
export function rcDetailsColumns(rc: RcDetails | undefined): Record<string, string | number> {
  if (!rc) {
    return {};
  }
  const out: Record<string, string | number> = {};
  const text = (col: string, v: string | null | undefined, up = false) => {
    const t = v?.trim();
    if (t) {
      out[col] = up ? t.toUpperCase() : t;
    }
  };
  const num = (col: string, v: string | undefined, int: boolean, min: number) => {
    const t = v?.trim();
    const n = t ? Number(t) : NaN;
    if (Number.isFinite(n) && n >= min && (!int || Number.isInteger(n))) {
      out[col] = n;
    }
  };
  text('reg_date', rc.regDate);
  text('valid_upto', rc.validUpto);
  text('address', rc.address);
  text('body_type', rc.bodyType);
  text('chassis_number', rc.chassisNumber, true);
  text('engine_number', rc.engineNumber, true);
  num('seating_capacity', rc.seatingCapacity, true, 1);
  num('gross_weight', rc.grossWeight, false, 0);
  num('unladen_weight', rc.unladenWeight, false, 0);
  return out;
}

/** @deprecated name kept for older call sites. */
export type DocumentNumbers = DocumentFields;

const required = (value: string | undefined, label: string) => {
  const v = value?.trim();
  if (!v) {
    throw new ApiError({ kind: 'validation', code: 'DOCUMENT_FIELD_REQUIRED', message: `${label} is required` });
  }
  return v;
};
const upper = (v: string) => v.toUpperCase().replace(/\s+/g, '');

/**
 * The vdocs row as the web builds it: `vehicle_id`, the required number(s), `registration_number`,
 * `make_id / model_id / variant_id` on RC and insurance, the expiry column, and the file path (if any).
 */
export function documentRow(
  key: DocumentKey,
  vehicle: VehicleRef,
  fields: DocumentFields,
  documentPath: string | null,
): Record<string, string | number | null> {
  const base: Record<string, string | null> = {
    vehicle_id: vehicle.id,
    registration_number: vehicle.vehicleNumber,
    ...(documentPath ? { document_path: documentPath } : {}),
  };
  const links = { make_id: vehicle.makeId, model_id: vehicle.modelId, variant_id: vehicle.variantId };
  const expiry = fields.expiry || null;
  switch (key) {
    case 'rc': {
      const v = fields.vehicle;
      return {
        ...base,
        ...links,
        ...(v && {
          make_id: v.makeId,
          model_id: v.modelId,
          variant_id: v.variantId,
          fuel_type: v.fuelType,
          ...(v.colour.trim() && { colour: v.colour.trim() }),
        }),
        ...rcDetailsColumns(fields.rc),
        registration_number: upper(fields.registrationNumber?.trim() || vehicle.vehicleNumber),
      };
    }
    case 'insurance':
      return {
        ...base,
        ...links,
        policy_no: required(fields.policyNo, 'Policy number'),
        insurer: required(fields.insurer, 'Insurer'),
        end_date: expiry,
      };
    case 'pollution':
      return { ...base, certificate_no: required(fields.certificateNo, 'Certificate number'), validity_expiry_date: expiry };
    case 'fastag':
      return { ...base, fastag_id: required(fields.fastagId, 'FASTag ID') };
  }
}

const Created = z.object({ id: z.string() });

/**
 * Saves one document: the file (optional) to vehicle-docs/<uid>/<table>/<uuid>.<ext>, then the row. If
 * the insert fails, the uploaded file is removed (as the web does). Returns the new row id.
 */
export async function saveVehicleDocument(
  uid: string,
  key: DocumentKey,
  vehicle: VehicleRef,
  file: LocalFile | null,
  fields: DocumentFields,
): Promise<string> {
  const table = DOCUMENT_TABLES[key];
  const ext = file ? EXTENSIONS[file.mimeType] : undefined;
  if (file && !ext) {
    throw new ApiError({ kind: 'validation', code: 'UNSUPPORTED_FILE', message: `Unsupported type ${file.mimeType}` });
  }
  // Validate before uploading anything.
  documentRow(key, vehicle, fields, null);
  const path = file
    ? await uploadFile(STORAGE.VEHICLE_DOCS, STORAGE_PATHS.vehicleDocument(uid, table, newId(), ext!), file)
    : null;
  const res = await getSupabase().from(table).insert(documentRow(key, vehicle, fields, path)).select('id').single();
  if (res.error) {
    if (path) {
      await removeFile(STORAGE.VEHICLE_DOCS, path).catch(e => logger.warn('orphan document file', { table, e: String(e) }));
    }
    throw restError(res);
  }
  return parseOrThrow(Created, res.data, `${table} insert`).id;
}
