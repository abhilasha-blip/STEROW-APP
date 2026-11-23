import { decideStartRoute, type StartRouteInput } from '@/utils/startRoute';

const base: StartRouteInput = {
  hasDrivingLicense: false,
  documentCount: 0,
  profileDone: false,
  dlSkipped: false,
  documentsSkipped: false,
};

describe('decideStartRoute (3-step onboarding)', () => {
  it.each<[string, Partial<StartRouteInput>, ReturnType<typeof decideStartRoute>]>([
    ['nothing done', {}, 'Step1Profile'],
    ['documents exist but no DL', { documentCount: 3 }, 'Step1Profile'],
    ['profile done, no DL', { profileDone: true }, 'Step2DrivingLicence'],
    ['documents skipped but DL not done/skipped', { documentsSkipped: true }, 'Step1Profile'],
    ['DL done, no documents', { hasDrivingLicense: true }, 'Step3Documents'],
    ['DL skipped, no documents', { dlSkipped: true }, 'Step3Documents'],
    ['DL done, documents skipped', { hasDrivingLicense: true, documentsSkipped: true }, 'Dashboard'],
    ['DL skipped, documents skipped', { dlSkipped: true, documentsSkipped: true }, 'Dashboard'],
    ['DL done, one document', { hasDrivingLicense: true, documentCount: 1 }, 'Dashboard'],
  ])('%s', (_name, input, expected) => {
    expect(decideStartRoute({ ...base, ...input })).toBe(expected);
  });
});
