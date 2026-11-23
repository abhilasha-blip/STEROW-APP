import { z } from 'zod';
import { AVATARS, type AvatarId } from '@/constants/avatars';
import { MIN_AGE_YEARS } from '@/constants/onboarding';
import { strings } from '@/constants/strings';
import { isOldEnough, isValidEmail, isValidFullName, parseIsoDate } from '@/utils/validation';

const e = strings.onboarding.errors;

const avatarIds = AVATARS.map(a => a.id) as [AvatarId, ...AvatarId[]];

export const avatarSchema = z
  .discriminatedUnion('type', [
    z.object({ type: z.literal('preset'), id: z.enum(avatarIds) }),
    z.object({ type: z.literal('photo'), uri: z.string().min(1) }),
  ])
  .nullable();

/** 1/3 "My Profile" form state (what the inputs hold). */
export const profileFieldsSchema = z.object({
  avatar: avatarSchema,
  fullName: z.string(),
  /** "YYYY-MM-DD" (local calendar date) or null. Not sent: no backend column yet. */
  dob: z.string().nullable(),
  /** Not sent: the account email is read-only on the web. */
  email: z.string(),
});

export type ProfileFormValues = z.infer<typeof profileFieldsSchema>;

/** Full Name, DOB (18+) and Email are required. `today` is injectable for tests. */
export function createProfileSchema(today: () => Date = () => new Date()) {
  return profileFieldsSchema.superRefine((v, ctx) => {
    if (!isValidFullName(v.fullName)) {
      ctx.addIssue({ code: 'custom', path: ['fullName'], message: e.fullName });
    }
    if (!v.dob || !parseIsoDate(v.dob)) {
      ctx.addIssue({ code: 'custom', path: ['dob'], message: e.dobRequired });
    } else if (!isOldEnough(v.dob, MIN_AGE_YEARS, today())) {
      ctx.addIssue({ code: 'custom', path: ['dob'], message: e.dobTooYoung(MIN_AGE_YEARS) });
    }
    if (!v.email.trim()) {
      ctx.addIssue({ code: 'custom', path: ['email'], message: e.emailRequired });
    } else if (!isValidEmail(v.email)) {
      ctx.addIssue({ code: 'custom', path: ['email'], message: e.emailInvalid });
    }
  });
}

export const profileSchema = createProfileSchema();
