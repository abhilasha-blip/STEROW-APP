import { z } from 'zod';
import type { DocumentKey } from '@/constants/onboarding';
import { ENDPOINTS } from '../endpoints';
import { unwrap } from '../rest';
import { parseOrThrow } from '../schemas/auth.schemas';
import { getSupabase } from '../supabase';
import { DOCUMENT_TABLES } from './vehicleDocuments.service';
import { getSignedUrl } from './storage.service';

const { REST, STORAGE } = ENDPOINTS.SUPABASE;

export type MyDocumentKey = DocumentKey | 'drivingLicence';

/** One row of My Documents' "Document List". */
export type MyDocument = {
  key: MyDocumentKey;
  id: string;
  /** Insurer (insurance) – the subtitle's first part. */
  issuer: string | null;
  /** The document's own number: registration / policy / certificate no., FASTag ID, DL number. */
  number: string | null;
  /** "YYYY-MM-DD" or null. */
  expiry: string | null;
  documentPath: string | null;
  /** The file's bucket (vehicle-docs, or driving-licenses for the licence). */
  bucket: string;
};

/** The expiry column of each table (the web's expiryKey). FASTag has none. */
const EXPIRY_COLUMN: Record<DocumentKey, string | null> = {
  rc: 'valid_upto',
  insurance: 'end_date',
  pollution: 'validity_expiry_date',
  fastag: null,
};

const Row = z.record(z.string(), z.unknown()).and(z.object({ id: z.string() }));
const str = (v: unknown) => (typeof v === 'string' && v ? v : null);
/** Dates may come back as timestamps; keep the calendar date. */
const day = (v: unknown) => (typeof v === 'string' && v ? v.slice(0, 10) : null);

/** The number column of each table (the web's card title). */
const NUMBER_COLUMN: Record<DocumentKey, string> = {
  rc: 'registration_number',
  insurance: 'policy_no',
  pollution: 'certificate_no',
  fastag: 'fastag_id',
};

/** Display order (my-documents.png): Insurance, Pollution, RC, FASTag, then the driving licence. */
const ORDER: DocumentKey[] = ['insurance', 'pollution', 'rc', 'fastag'];

/**
 * The selected vehicle's documents (newest per type first) plus the user's driving licence. RLS limits
 * rows to vehicles the user can see.
 */
export async function listMyDocuments(vehicleId: string, uid: string): Promise<MyDocument[]> {
  const supabase = getSupabase();
  const [vdocs, dl] = await Promise.all([
    Promise.all(
      ORDER.map(key =>
        supabase.from(DOCUMENT_TABLES[key]).select('*').eq('vehicle_id', vehicleId).order('create_at', { ascending: false }),
      ),
    ),
    supabase.from(REST.USER_DRIVING_LICENSES).select('id,dl_number,valid_upto,document_path').eq('user_id', uid).limit(1),
  ]);
  const docs: MyDocument[] = ORDER.flatMap((key, i) =>
    parseOrThrow(z.array(Row), unwrap(vdocs[i]).data, DOCUMENT_TABLES[key]).map(r => ({
      key,
      id: r.id,
      issuer: key === 'insurance' ? str(r.insurer) : null,
      number: str(r[NUMBER_COLUMN[key]]),
      expiry: EXPIRY_COLUMN[key] ? day(r[EXPIRY_COLUMN[key]!]) : null,
      documentPath: str(r.document_path),
      bucket: STORAGE.VEHICLE_DOCS,
    })),
  );
  const licence = parseOrThrow(z.array(Row), unwrap(dl).data, 'user_driving_licenses')[0];
  if (licence) {
    docs.push({
      key: 'drivingLicence',
      id: licence.id,
      issuer: null,
      number: str(licence.dl_number),
      expiry: day(licence.valid_upto),
      documentPath: str(licence.document_path),
      bucket: STORAGE.DRIVING_LICENSES,
    });
  }
  return docs;
}

/** A temporary URL to open a document's file. */
export const documentFileUrl = (doc: MyDocument) =>
  doc.documentPath ? getSignedUrl(doc.bucket, doc.documentPath) : Promise.resolve(null);

/**
 * The saved document per type (the newest row; the list is newest first): what decides whether a card is
 * locked (read-only) or can take a new upload.
 */
export function latestSavedDocuments(docs: readonly MyDocument[] | undefined): Partial<Record<MyDocumentKey, MyDocument>> {
  const out: Partial<Record<MyDocumentKey, MyDocument>> = {};
  for (const doc of docs ?? []) {
    out[doc.key] ??= doc;
  }
  return out;
}
