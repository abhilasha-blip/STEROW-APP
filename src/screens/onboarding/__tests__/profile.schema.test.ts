import { strings } from '@/constants/strings';
import { createProfileSchema, type ProfileFormValues } from '../schemas/profile.schema';

const e = strings.onboarding.errors;
const schema = createProfileSchema();

const base: ProfileFormValues = { avatar: { type: 'preset', id: 'avatar-01' }, fullName: '', email: '' };
const ok = { ...base, fullName: 'John Cooper', email: 'john.cooper@gmail.com' };

const issues = (v: ProfileFormValues) => {
  const r = schema.safeParse(v);
  return r.success ? {} : Object.fromEntries(r.error.issues.map(i => [i.path.join('.'), i.message]));
};

describe('profile schema (1/3: photo, Full Name, Email; no DOB)', () => {
  it('Full Name and Email are required', () => {
    expect(issues(base)).toEqual({ fullName: strings.fullNameErrors.required, email: e.emailRequired });
  });

  it('checks the email format', () => {
    expect(issues({ ...ok, email: 'john@gmail' })).toEqual({ email: e.emailInvalid });
  });

  it('accepts a complete profile with any avatar choice; there is no DOB field', () => {
    expect(issues(ok)).toEqual({});
    expect(issues({ ...ok, avatar: null })).toEqual({});
    expect(issues({ ...ok, avatar: { type: 'photo', uri: 'file:///me.jpg' } })).toEqual({});
    expect(schema.safeParse({ ...ok, avatar: { type: 'preset', id: 'avatar-99' } }).success).toBe(false);
    expect(Object.keys(schema.parse(ok))).toEqual(['avatar', 'fullName', 'email']);
  });
});
