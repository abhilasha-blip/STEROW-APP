import { DOCUMENT_KEYS, ONBOARDING_STEP, ONBOARDING_TOTAL_STEPS } from '@/constants/onboarding';
import {
  addedDocuments,
  canProceedDocuments,
  DOCUMENT_FORM_FIELDS,
  documentStatus,
  EMPTY_DOCUMENTS,
  type DocumentsFormValues,
} from '../schemas';
import type { UploadedFile } from '@/utils/uploadFile';

const FILE: UploadedFile = { uri: 'file:///a.jpg', name: 'a.jpg', mimeType: 'image/jpeg' };
const withVehicle: DocumentsFormValues = { ...EMPTY_DOCUMENTS, vehicleId: 'v-1' };
const INSURANCE = { policyNo: 'P1', insurer: 'Acko', expiry: '2027-01-15' };

describe('onboarding rules', () => {
  it('3 steps: Profile 1/3, Driving Licence 2/3, Documents 3/3 (the design says "3/4": inconsistency)', () => {
    expect(ONBOARDING_TOTAL_STEPS).toBe(3);
    expect(ONBOARDING_STEP).toEqual({ profile: 1, drivingLicence: 2, documents: 3 });
  });

  it('3/3 cards: RC, Insurance, Pollution, FASTag (last); "Add Manually" fields per card', () => {
    expect(DOCUMENT_KEYS).toEqual(['rc', 'insurance', 'pollution', 'fastag']);
    expect(DOCUMENT_FORM_FIELDS).toEqual({
      rc: ['registrationNumber'],
      insurance: ['policyNo', 'insurer', 'expiry'],
      pollution: ['certificateNo', 'expiry'],
      fastag: ['fastagId'],
    });
  });

  it('card status: empty → file (RC: added; others: needs details) → details → added', () => {
    expect(documentStatus('rc', { file: null, fields: null })).toBe('empty');
    expect(documentStatus('rc', { file: FILE, fields: null })).toBe('added');
    expect(documentStatus('insurance', { file: FILE, fields: null })).toBe('needsDetails');
    expect(documentStatus('insurance', { file: FILE, fields: { policyNo: 'P1', insurer: 'Acko' } })).toBe('needsDetails');
    expect(documentStatus('insurance', { file: null, fields: INSURANCE })).toBe('added');
    expect(documentStatus('insurance', { file: FILE, fields: INSURANCE })).toBe('added');
    expect(documentStatus('pollution', { file: null, fields: { certificateNo: 'C1', expiry: 'bad' } })).toBe('empty');
    expect(documentStatus('fastag', { file: null, fields: { fastagId: 'F1' } })).toBe('added');
  });

  it('Next: a vehicle, ≥ 1 added document, no file left without its details', () => {
    expect(canProceedDocuments(withVehicle)).toBe(false);
    expect(canProceedDocuments({ ...withVehicle, rc: { file: FILE, fields: null } })).toBe(true);
    expect(canProceedDocuments({ ...EMPTY_DOCUMENTS, rc: { file: FILE, fields: null } })).toBe(false); // no vehicle
    expect(
      canProceedDocuments({ ...withVehicle, rc: { file: FILE, fields: null }, insurance: { file: FILE, fields: null } }),
    ).toBe(false);
    expect(addedDocuments({ ...withVehicle, fastag: { file: null, fields: { fastagId: 'F1' } } })).toEqual(['fastag']);
  });
});
