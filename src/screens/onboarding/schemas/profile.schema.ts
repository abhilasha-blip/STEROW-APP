import { z } from 'zod';
import { AVATARS, type AvatarId } from '@/constants/avatars';
import { MIN_AGE_YEARS } from '@/constants/onboarding';
import { strings } from '@/constants/strings';
import {
  isOldEnough,
  isValidDlNumber,
  isValidEmail,
  isValidFullName,
  normalizeDlNumber,
  parseIsoDate,
} from '@/utils/validation';

const e = strings.onboarding.errors;

const avatarIds = AVATARS.map(a => a.id) as [AvatarId, ...AvatarId[]];

export const avatarSchema = z
  .discriminatedUnion('type', [
    z.object({ type: z.literal('preset'), id: z.enum(avatarIds) }),
    z.object({ type: z.literal('photo'), uri: z.string().min(1) }),
  ])
  .nullable();

/** Raw form state (what the inputs hold). */
export const profileFieldsSchema = z.object({
  avatar: avatarSchema,
  /** Normalised as typed: upper-case A–Z/0–9 only. */
  dlNumber: z.string(),
  /** Local file uri of the uploaded licence photo. */
  dlImageUri: z.string().nullable(),
  fullName: z.string(),
  /** "YYYY-MM-DD" (local calendar date) or null. */
  dob: z.string().nullable(),
  email: z.string(),
});

export type ProfileFormValues = z.infer<typeof profileFieldsSchema>;

export type ProfileVisibility = {
  /** "Or" + "Upload your DL": while no DL number is typed, or once an image is uploaded. */
  showUpload: boolean;
  /** Full Name / DOB / Email: after a valid DL number or an upload (tomorrow: OCR prefill). */
  showPersonal: boolean;
};

/**
 * State logic (an interpretation of the two Figma frames – to confirm with the designer):
 * - empty DL & no upload    → Or + empty upload box; personal fields hidden
 * - DL image uploaded       → filled upload box + personal fields
 * - valid DL number typed   → upload section hidden, personal fields shown
 * - DL number being typed (not valid yet) → upload section hidden, personal fields hidden
 */
export function getProfileVisibility(v: Pick<ProfileFormValues, 'dlNumber' | 'dlImageUri'>): ProfileVisibility {
  const typed = normalizeDlNumber(v.dlNumber).length > 0;
  const uploaded = !!v.dlImageUri;
  return {
    showUpload: !typed || uploaded,
    showPersonal: uploaded || isValidDlNumber(v.dlNumber),
  };
}

/**
 * Validates only what is visible, so Next shows inline errors exactly for the fields on screen.
 * `today` is injectable for tests.
 */
export function createProfileSchema(today: () => Date = () => new Date()) {
  return profileFieldsSchema.superRefine((v, ctx) => {
    const { showPersonal } = getProfileVisibility(v);
    const dl = normalizeDlNumber(v.dlNumber);

    if (!dl && !v.dlImageUri) {
      ctx.addIssue({ code: 'custom', path: ['dlNumber'], message: e.dlRequired });
    } else if (dl && !v.dlImageUri && !isValidDlNumber(dl)) {
      ctx.addIssue({ code: 'custom', path: ['dlNumber'], message: e.dlInvalid });
    }

    if (!showPersonal) {
      return;
    }
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
