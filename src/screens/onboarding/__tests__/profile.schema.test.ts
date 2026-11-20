import { strings } from '@/constants/strings';
import { createProfileSchema, getProfileVisibility, type ProfileFormValues } from '../profile.schema';

const e = strings.onboarding.errors;
const schema = createProfileSchema(() => new Date(2026, 10, 19));

const base: ProfileFormValues = {
  avatar: { type: 'preset', id: 'avatar-01' },
  dlNumber: '',
  dlImageUri: null,
  fullName: '',
  dob: null,
  email: '',
};
const personal = { fullName: 'John Cooper', dob: '1990-01-01', email: 'john.cooper@gmail.com' };

const issues = (v: ProfileFormValues) => {
  const r = schema.safeParse(v);
  return r.success ? {} : Object.fromEntries(r.error.issues.map(i => [i.path.join('.'), i.message]));
};

describe('getProfileVisibility', () => {
  it.each([
    ['empty', { dlNumber: '', dlImageUri: null }, { showUpload: true, showPersonal: false }],
    ['typing (invalid yet)', { dlNumber: 'TS01', dlImageUri: null }, { showUpload: false, showPersonal: false }],
    ['valid DL typed', { dlNumber: 'TS0120110012345', dlImageUri: null }, { showUpload: false, showPersonal: true }],
    ['uploaded', { dlNumber: '', dlImageUri: 'file:///dl.jpg' }, { showUpload: true, showPersonal: true }],
    ['uploaded + typing', { dlNumber: 'TS', dlImageUri: 'file:///dl.jpg' }, { showUpload: true, showPersonal: true }],
  ])('%s', (_name, v, expected) => expect(getProfileVisibility(v)).toEqual(expected));
});

describe('profile schema', () => {
  it('needs a DL number or an upload', () => {
    expect(issues(base)).toEqual({ dlNumber: e.dlRequired });
  });

  it('rejects an invalid DL number and validates only the visible fields', () => {
    expect(issues({ ...base, dlNumber: 'TS01' })).toEqual({ dlNumber: e.dlInvalid });
  });

  it('a valid DL number reveals the personal fields, which are then required', () => {
    expect(issues({ ...base, dlNumber: 'TS0120110012345' })).toEqual({
      fullName: e.fullName,
      dob: e.dobRequired,
      email: e.emailRequired,
    });
  });

  it('an upload also requires the personal fields; the DL number becomes optional', () => {
    expect(issues({ ...base, dlImageUri: 'file:///dl.jpg', ...personal })).toEqual({});
    expect(issues({ ...base, dlImageUri: 'file:///dl.jpg', dlNumber: 'TS', ...personal })).toEqual({});
  });

  it('checks email format and the 18+ rule', () => {
    expect(
      issues({ ...base, dlNumber: 'TS0120110012345', ...personal, email: 'john@gmail', dob: '2010-05-05' }),
    ).toEqual({ email: e.emailInvalid, dob: e.dobTooYoung(18) });
  });

  it('accepts a complete profile with any avatar choice', () => {
    const ok = { ...base, dlNumber: 'TS0120110012345', ...personal };
    expect(issues(ok)).toEqual({});
    expect(issues({ ...ok, avatar: null })).toEqual({});
    expect(issues({ ...ok, avatar: { type: 'photo', uri: 'file:///me.jpg' } })).toEqual({});
    expect(schema.safeParse({ ...ok, avatar: { type: 'preset', id: 'avatar-99' } }).success).toBe(false);
  });

  it('uses the real clock by default', () => {
    const r = createProfileSchema().safeParse({ ...base, dlNumber: 'TS0120110012345', ...personal });
    expect(r.success).toBe(true);
  });
});
