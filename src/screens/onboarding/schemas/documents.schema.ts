import { z } from 'zod';
import { DOCUMENT_KEYS, MIN_DOCUMENTS_TO_CONTINUE, type DocumentKey } from '@/constants/onboarding';
import { uploadedFileSchema, type UploadedFile } from '@/utils/uploadFile';

/** Step 3 form state: one optional file per document. */
export const documentsFieldsSchema = z.object({
  rc: uploadedFileSchema.nullable(),
  license: uploadedFileSchema.nullable(),
  insurance: uploadedFileSchema.nullable(),
  pollution: uploadedFileSchema.nullable(),
});
export type DocumentsFormValues = z.infer<typeof documentsFieldsSchema>;

/**
 * What the store keeps for step 3: `undefined` = never touched on step 3 (inherit the earlier upload),
 * `null` = removed on step 3, a file = attached on step 3.
 */
export type StoredDocuments = Partial<Record<DocumentKey, UploadedFile | null>>;

export type DocumentPrefill = {
  /** The RC attached on step 2. */
  vehicleRc: UploadedFile | null;
  /** The DL photo uploaded on step 1. */
  profileDl: UploadedFile | null;
};

/** Step 3 values: its own choices, else the RC from step 2 and the licence from step 1. */
export function resolveDocuments(stored: StoredDocuments, prefill: DocumentPrefill): DocumentsFormValues {
  const pick = (key: DocumentKey, fallback: UploadedFile | null) =>
    stored[key] === undefined ? fallback : stored[key] ?? null;
  return {
    rc: pick('rc', prefill.vehicleRc),
    license: pick('license', prefill.profileDl),
    insurance: pick('insurance', null),
    pollution: pick('pollution', null),
  };
}

export const countAttachedDocuments = (v: DocumentsFormValues): number =>
  DOCUMENT_KEYS.filter(key => !!v[key]).length;

/** Step 3 "Next": at least MIN_DOCUMENTS_TO_CONTINUE documents attached. */
export const canProceedDocuments = (v: DocumentsFormValues): boolean =>
  countAttachedDocuments(v) >= MIN_DOCUMENTS_TO_CONTINUE;
