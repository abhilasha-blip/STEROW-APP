import { z } from 'zod';
import { DOCUMENT_KEYS, MIN_DOCUMENTS_TO_CONTINUE } from '@/constants/onboarding';
import { uploadedFileSchema } from '@/utils/uploadFile';

/** 3/3 form state: one optional file per document. */
export const documentsFieldsSchema = z.object({
  rc: uploadedFileSchema.nullable(),
  insurance: uploadedFileSchema.nullable(),
  pollution: uploadedFileSchema.nullable(),
});
export type DocumentsFormValues = z.infer<typeof documentsFieldsSchema>;

export const EMPTY_DOCUMENTS: DocumentsFormValues = { rc: null, insurance: null, pollution: null };

export const countAttachedDocuments = (v: DocumentsFormValues): number =>
  DOCUMENT_KEYS.filter(key => !!v[key]).length;

/** 3/3 "Next": at least MIN_DOCUMENTS_TO_CONTINUE documents attached. */
export const canProceedDocuments = (v: DocumentsFormValues): boolean =>
  countAttachedDocuments(v) >= MIN_DOCUMENTS_TO_CONTINUE;
