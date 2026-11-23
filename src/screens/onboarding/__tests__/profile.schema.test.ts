import { strings } from '@/constants/strings';
import { createProfileSchema, type ProfileFormValues } from '../schemas/profile.schema';

const e = strings.onboarding.errors;
const schema = createProfileSchema(() => new Date(2026, 10, 19));

const base: ProfileFormValues = { avatar: { type: 'preset', id: 'avatar-01' }, fullName: '', dob: null, email: '' };
const personal = { fullName: 'John Cooper', dob: '1990-01-01', email: 'john.cooper@gmail.com' };

const issues = (v: ProfileFormValues) => {
  const r = schema.safeParse(v);
  return r.success ? {} : Object.fromEntries(r.error.issues.map(i => [i.path.join('.'), i.message]));
};

describe('profile schema (1/3)', () => {
  it('Full Name, DOB and Email are required', () => {
    expect(issues(base)).toEqual({ fullName: e.fullName, dob: e.dobRequired, email: e.emailRequired });
  });

  it('checks email format and the 18+ rule', () => {
    expect(issues({ ...base, ...personal, email: 'john@gmail', dob: '2010-05-05' })).toEqual({
      email: e.emailInvalid,
      dob: e.dobTooYoung(18),
    });
  });

  it('accepts a complete profile with any avatar choice', () => {
    const ok = { ...base, ...personal };
    expect(issues(ok)).toEqual({});
    expect(issues({ ...ok, avatar: null })).toEqual({});
    expect(issues({ ...ok, avatar: { type: 'photo', uri: 'file:///me.jpg' } })).toEqual({});
    expect(schema.safeParse({ ...ok, avatar: { type: 'preset', id: 'avatar-99' } }).success).toBe(false);
  });

  it('uses the real clock by default', () => {
    expect(createProfileSchema().safeParse({ ...base, ...personal }).success).toBe(true);
  });
});
