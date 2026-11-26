import { DOCUMENT_KEYS, type DocumentKey } from '@/constants/onboarding';
import type { VehicleDetails } from '@/api/services/vehicle.service';
import type { RcDetails } from '@/api/services/vehicleDocuments.service';
import type { MyDocument } from '@/api/services/myDocuments.service';
import { canReplaceDocument, getDocumentStatus } from '@/utils/documentStatus';
import type { UploadedFile } from '@/utils/uploadFile';
import { parseIsoDate } from '@/utils/validation';

/** "Add Manually" details (the fields each table needs; see vehicleDocuments.service). */
export type DocumentFieldValues = {
  registrationNumber?: string;
  policyNo?: string;
  insurer?: string;
  certificateNo?: string;
  fastagId?: string;
  /** "YYYY-MM-DD": insurance expiry / PUC validity. */
  expiry?: string | null;
  /** RC "Add Manually" opens "Your Vehicle details": the vehicle's details as on the RC. */
  vehicle?: VehicleDetails;
  /** RC "Add Manually": the RC's own columns (dates, address, body type, numbers, weights). */
  rc?: RcDetails;
};

/** One card: an uploaded file, typed details, or both. */
export type DocumentEntry = { file: UploadedFile | null; fields: DocumentFieldValues | null };

/** 3/3 form state: the selected vehicle and one entry per document. */
export type DocumentsFormValues = { vehicleId: string | null } & Record<DocumentKey, DocumentEntry>;

/** The sheet's fields (`vehicle` comes from the RC details screen). */
export type DocumentField = Exclude<keyof DocumentFieldValues, 'vehicle' | 'rc'>;

/** The fields of each "Add Manually" form, in order; all are required. */
export const DOCUMENT_FORM_FIELDS: Record<DocumentKey, readonly DocumentField[]> = {
  rc: ['registrationNumber'],
  insurance: ['policyNo', 'insurer', 'expiry'],
  pollution: ['certificateNo', 'expiry'],
  fastag: ['fastagId'],
};

/**
 * What a saved row needs (database NOT NULL / web rule): RC nothing (the registration number defaults to
 * the vehicle number), Insurance policy no. + insurer, PUC certificate no., FASTag id. Expiry dates are
 * asked for in the form (they drive My Documents' statuses) and are checked by the form itself.
 */
const SAVE_REQUIRED: Record<DocumentKey, readonly DocumentField[]> = {
  rc: [],
  insurance: ['policyNo', 'insurer'],
  pollution: ['certificateNo'],
  fastag: ['fastagId'],
};

const EMPTY_ENTRY: DocumentEntry = { file: null, fields: null };

export const EMPTY_DOCUMENTS: DocumentsFormValues = {
  vehicleId: null,
  rc: EMPTY_ENTRY,
  insurance: EMPTY_ENTRY,
  pollution: EMPTY_ENTRY,
  fastag: EMPTY_ENTRY,
};

export type DocumentStatus = 'empty' | 'needsDetails' | 'added';

const filled = (v: unknown) => typeof v === 'string' && v.trim().length > 0;

/** The "Add Manually" form is complete (all its fields; dates valid). */
export const isFormComplete = (key: DocumentKey, fields: DocumentFieldValues | null): boolean =>
  !!fields &&
  DOCUMENT_FORM_FIELDS[key].every(f => (f === 'expiry' ? !!fields.expiry && !!parseIsoDate(fields.expiry) : filled(fields[f])));

/**
 * - empty: nothing attached or typed
 * - needsDetails: a file whose required details are missing (Insurance / PUC / FASTag can't be saved
 *   with a file alone)
 * - added: ready to save (✓ Added)
 */
export function documentStatus(key: DocumentKey, entry: DocumentEntry): DocumentStatus {
  if (entry.fields && isFormComplete(key, entry.fields)) {
    return 'added';
  }
  if (!entry.file) {
    return 'empty';
  }
  return SAVE_REQUIRED[key].length === 0 ? 'added' : 'needsDetails';
}

export const addedDocuments = (v: DocumentsFormValues): DocumentKey[] =>
  DOCUMENT_KEYS.filter(k => documentStatus(k, v[k]) === 'added');

export const countAttachedDocuments = (v: DocumentsFormValues): number => addedDocuments(v).length;

/** 3/3 Next: a vehicle, at least one added document, and no file left without its details. */
export const canProceedDocuments = (v: DocumentsFormValues): boolean =>
  !!v.vehicleId &&
  addedDocuments(v).length > 0 &&
  DOCUMENT_KEYS.every(k => documentStatus(k, v[k]) !== 'needsDetails');

/** Saved documents per type (newest row each), from the API. */
export type SavedDocuments = Partial<Record<DocumentKey, MyDocument>>;

/** Pollution is always uploadable (it only shows its status). */
export const ALWAYS_UPLOADABLE: Partial<Record<DocumentKey, true>> = { pollution: true };

/** Read-only card: a saved document that hasn't expired yet (Pollution never is). */
export const isDocumentLocked = (key: DocumentKey, saved: MyDocument | undefined): boolean =>
  !!saved && !canReplaceDocument(getDocumentStatus(saved.expiry), !!ALWAYS_UPLOADABLE[key]);

/**
 * The form without the locked documents' entries: a locked card shows the saved document, so nothing
 * typed or picked earlier for it (e.g. before a vehicle switch) may be saved.
 */
export function withoutLocked(values: DocumentsFormValues, saved: SavedDocuments | undefined): DocumentsFormValues {
  const locked = DOCUMENT_KEYS.filter(k => isDocumentLocked(k, saved?.[k]));
  if (!locked.length) {
    return values;
  }
  return { ...values, ...Object.fromEntries(locked.map(k => [k, EMPTY_ENTRY])) };
}
