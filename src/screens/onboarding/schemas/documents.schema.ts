import { z } from 'zod';
import { DOCUMENT_KEYS, type DocumentKey } from '@/constants/onboarding';
import { uploadedFileSchema } from '@/utils/uploadFile';
import { isValidVehicleNumber } from '@/utils/validation';

/**
 * 3/3 form state: the vehicle (number + model, the minimum the database needs) and four optional
 * documents, each a file plus its required number field(s).
 */
export const documentsFieldsSchema = z.object({
  /** Normalised as typed: upper-case A–Z / 0–9. Also the RC's registration number. */
  vehicleNumber: z.string(),
  /** vehicle_variant_master id (make + model + variant; fuel / transmission come from it). */
  variantId: z.string().nullable(),
  rc: uploadedFileSchema.nullable(),
  insurance: uploadedFileSchema.nullable(),
  insurancePolicyNo: z.string(),
  insurer: z.string(),
  pollution: uploadedFileSchema.nullable(),
  pucCertificateNo: z.string(),
  fastag: uploadedFileSchema.nullable(),
  fastagId: z.string(),
});
export type DocumentsFormValues = z.infer<typeof documentsFieldsSchema>;

export type DocumentNumberField = 'insurancePolicyNo' | 'insurer' | 'pucCertificateNo' | 'fastagId';

/** The number field(s) each document needs (database NOT NULL / web rule). The RC uses the vehicle number. */
export const DOCUMENT_NUMBER_FIELDS: Record<DocumentKey, readonly DocumentNumberField[]> = {
  rc: [],
  insurance: ['insurancePolicyNo', 'insurer'],
  pollution: ['pucCertificateNo'],
  fastag: ['fastagId'],
};

export const EMPTY_DOCUMENTS: DocumentsFormValues = {
  vehicleNumber: '',
  variantId: null,
  rc: null,
  insurance: null,
  insurancePolicyNo: '',
  insurer: '',
  pollution: null,
  pucCertificateNo: '',
  fastag: null,
  fastagId: '',
};

/** Documents with a file attached (the ones Next saves). */
export const attachedDocuments = (v: DocumentsFormValues): DocumentKey[] => DOCUMENT_KEYS.filter(key => !!v[key]);

export const countAttachedDocuments = (v: DocumentsFormValues): number => attachedDocuments(v).length;

/** An attached document's number fields are all filled. */
export const isDocumentComplete = (v: DocumentsFormValues, key: DocumentKey): boolean =>
  DOCUMENT_NUMBER_FIELDS[key].every(f => !!v[f].trim());

/** 3/3 Next: a valid vehicle number, a model, and every attached document complete (documents are optional). */
export const canProceedDocuments = (v: DocumentsFormValues): boolean =>
  isValidVehicleNumber(v.vehicleNumber) && !!v.variantId && attachedDocuments(v).every(k => isDocumentComplete(v, k));
