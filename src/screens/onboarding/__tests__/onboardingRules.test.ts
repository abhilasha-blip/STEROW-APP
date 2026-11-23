import { DOCUMENT_KEYS, ONBOARDING_STEP, ONBOARDING_TOTAL_STEPS } from '@/constants/onboarding';
import {
  attachedDocuments,
  canProceedDocuments,
  DOCUMENT_NUMBER_FIELDS,
  EMPTY_DOCUMENTS,
  type DocumentsFormValues,
} from '../schemas';
import type { UploadedFile } from '@/utils/uploadFile';

const FILE: UploadedFile = { uri: 'file:///a.jpg', name: 'a.jpg', mimeType: 'image/jpeg' };
const vehicle: DocumentsFormValues = { ...EMPTY_DOCUMENTS, vehicleNumber: 'TS09EV1234', variantId: 'variant-1' };

describe('onboarding rules', () => {
  it('3 steps: Profile 1/3, Driving Licence 2/3, Documents 3/3', () => {
    expect(ONBOARDING_TOTAL_STEPS).toBe(3);
    expect(ONBOARDING_STEP).toEqual({ profile: 1, drivingLicence: 2, documents: 3 });
  });

  it('3/3 has RC, Insurance, Pollution and FASTag; required numbers per card (RC uses the vehicle number)', () => {
    expect(DOCUMENT_KEYS).toEqual(['rc', 'insurance', 'pollution', 'fastag']);
    expect(DOCUMENT_NUMBER_FIELDS).toEqual({
      rc: [],
      insurance: ['insurancePolicyNo', 'insurer'],
      pollution: ['pucCertificateNo'],
      fastag: ['fastagId'],
    });
  });

  it('3/3 Next needs a valid vehicle number and a model; documents are optional', () => {
    expect(canProceedDocuments(EMPTY_DOCUMENTS)).toBe(false);
    expect(canProceedDocuments({ ...vehicle, vehicleNumber: 'TS09' })).toBe(false);
    expect(canProceedDocuments({ ...vehicle, variantId: null })).toBe(false);
    expect(canProceedDocuments(vehicle)).toBe(true);
  });

  it("an added document needs its number field(s); the RC doesn't", () => {
    expect(canProceedDocuments({ ...vehicle, rc: FILE })).toBe(true);
    expect(canProceedDocuments({ ...vehicle, insurance: FILE, insurancePolicyNo: 'P1' })).toBe(false);
    expect(canProceedDocuments({ ...vehicle, insurance: FILE, insurancePolicyNo: 'P1', insurer: 'Acko' })).toBe(true);
    expect(canProceedDocuments({ ...vehicle, pollution: FILE, pucCertificateNo: ' ' })).toBe(false);
    expect(canProceedDocuments({ ...vehicle, fastag: FILE, fastagId: 'F1' })).toBe(true);
    expect(attachedDocuments({ ...vehicle, rc: FILE, fastag: FILE })).toEqual(['rc', 'fastag']);
    // Numbers typed for a card without a file are ignored.
    expect(canProceedDocuments({ ...vehicle, insurancePolicyNo: 'P1' })).toBe(true);
  });
});
