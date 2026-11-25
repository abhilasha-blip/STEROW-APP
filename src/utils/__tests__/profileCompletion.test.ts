import { getProfileCompletion, type CompletionDl, type CompletionUser } from '@/utils/profileCompletion';

const fullUser: CompletionUser = { fullName: 'Test User', email: 'a@b.co', avatarPath: 'uid/avatar.png' };
const fullDl: CompletionDl = { dlNumber: 'TS0120110012345', documentPath: 'uid/dl.jpg' };
const withDoc = [{ documentCount: 0 }, { documentCount: 2 }];

describe('getProfileCompletion', () => {
  it('100%: every item done → nothing missing, no next step', () => {
    expect(getProfileCompletion(fullUser, fullDl, withDoc)).toEqual({ percent: 100, missing: [], nextStep: null });
  });

  it('nothing saved: only the mobile (verified at sign-up) counts → 17%, starts at the profile', () => {
    expect(getProfileCompletion(null, null, [])).toEqual({
      percent: 17,
      missing: ['fullName', 'email', 'photo', 'drivingLicence', 'vehicleDocument'],
      nextStep: 'Step1Profile',
    });
    expect(getProfileCompletion(undefined, undefined, undefined).percent).toBe(17);
  });

  it('each item is worth one sixth (each missing one drops 100 → 83)', () => {
    const cases: [string, ReturnType<typeof getProfileCompletion>][] = [
      ['fullName', getProfileCompletion({ ...fullUser, fullName: '' }, fullDl, withDoc)],
      ['email', getProfileCompletion({ ...fullUser, email: '' }, fullDl, withDoc)],
      ['photo', getProfileCompletion({ ...fullUser, avatarPath: null }, fullDl, withDoc)],
      ['drivingLicence', getProfileCompletion(fullUser, null, withDoc)],
      ['vehicleDocument', getProfileCompletion(fullUser, fullDl, [])],
    ];
    for (const [item, result] of cases) {
      expect(result).toMatchObject({ percent: 83, missing: [item] });
    }
  });

  it('partial: percent = round(done / 6 × 100)', () => {
    // name + mobile + licence = 3/6
    expect(getProfileCompletion({ fullName: 'A B' }, fullDl, []).percent).toBe(50);
    // name + email + mobile + licence = 4/6 (the old banner's "always 67%" user, now precise)
    expect(getProfileCompletion({ fullName: 'A B', email: 'a@b.co' }, fullDl, [{ documentCount: 0 }]).percent).toBe(67);
    // name + mobile = 2/6
    expect(getProfileCompletion({ fullName: 'A B' }, null, []).percent).toBe(33);
  });

  it('the licence needs both the number and the saved file', () => {
    expect(getProfileCompletion(fullUser, { dlNumber: 'TS01', documentPath: null }, withDoc).missing).toEqual(['drivingLicence']);
    expect(getProfileCompletion(fullUser, { dlNumber: '', documentPath: 'p' }, withDoc).missing).toEqual(['drivingLicence']);
  });

  it('a vehicle only counts with a document; whitespace-only fields are missing', () => {
    expect(getProfileCompletion(fullUser, fullDl, [{ documentCount: 0 }]).missing).toEqual(['vehicleDocument']);
    expect(getProfileCompletion({ ...fullUser, fullName: '   ' }, fullDl, withDoc).missing).toEqual(['fullName']);
  });

  it('"Complete Now" target: first missing item in order profile → licence → vehicle/documents', () => {
    expect(getProfileCompletion({ ...fullUser, avatarPath: null }, null, []).nextStep).toBe('Step1Profile');
    expect(getProfileCompletion(fullUser, null, []).nextStep).toBe('Step2DrivingLicence');
    expect(getProfileCompletion(fullUser, fullDl, []).nextStep).toBe('Step3Documents');
  });
});
