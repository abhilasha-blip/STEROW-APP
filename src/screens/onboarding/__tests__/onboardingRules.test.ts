import { DOCUMENT_KEYS, MIN_DOCUMENTS_TO_CONTINUE, ONBOARDING_STEP, ONBOARDING_TOTAL_STEPS } from '@/constants/onboarding';
import { canProceedDocuments, countAttachedDocuments, EMPTY_DOCUMENTS } from '../schemas';
import type { UploadedFile } from '@/utils/uploadFile';

const FILE: UploadedFile = { uri: 'file:///a.jpg', name: 'a.jpg', mimeType: 'image/jpeg' };

describe('onboarding rules', () => {
  it('3 steps: Profile 1/3, Driving Licence 2/3, Documents 3/3', () => {
    expect(ONBOARDING_TOTAL_STEPS).toBe(3);
    expect(ONBOARDING_STEP).toEqual({ profile: 1, drivingLicence: 2, documents: 3 });
  });

  it('3/3 has RC, Insurance and Pollution Certificate (the DL has its own step)', () => {
    expect(DOCUMENT_KEYS).toEqual(['rc', 'insurance', 'pollution']);
  });

  it(`3/3 Next needs at least ${MIN_DOCUMENTS_TO_CONTINUE} document`, () => {
    expect(canProceedDocuments(EMPTY_DOCUMENTS)).toBe(false);
    expect(canProceedDocuments({ ...EMPTY_DOCUMENTS, pollution: FILE })).toBe(true);
    expect(countAttachedDocuments({ rc: FILE, insurance: FILE, pollution: null })).toBe(2);
  });
});
