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
  /**
   * The licence photo: a local file uri (picked now, uploaded on Next) or the signed URL of the file
   * already saved (not re-uploaded).
   */
  dlImageUri: z.string().nullable(),
  fullName: z.string(),
  /** "YYYY-MM-DD" (local calendar date) or null. */
  dob: z.string().nullable(),
  email: z.string(),
});

export type ProfileFormValues = z.infer<typeof profileFieldsSchema>;

export type ProfileVisibility = {
  /** The upload box. Always shown while OCR is unavailable: the licence file is required. */
  showUpload: boolean;
  /** "Or" between the number and the upload: only when OCR can read the number from the upload. */
  showOr: boolean;
  /** Full Name / DOB / Email: after a valid DL number or an upload. */
  showPersonal: boolean;
};

/**
 * With OCR (the original two Figma frames): number "Or" upload, typing a number hides the upload.
 * Without OCR (phase 1: no public DL OCR is used): the user types the number AND uploads the licence
 * (both required, as on the web), so the upload stays visible and there is no "Or".
 */
export function getProfileVisibility(
  v: Pick<ProfileFormValues, 'dlNumber' | 'dlImageUri'>,
  ocrAvailable = false,
): ProfileVisibility {
  const typed = normalizeDlNumber(v.dlNumber).length > 0;
  const uploaded = !!v.dlImageUri;
  return {
    showUpload: ocrAvailable ? !typed || uploaded : true,
    showOr: ocrAvailable && (!typed || uploaded),
    showPersonal: uploaded || isValidDlNumber(v.dlNumber),
  };
}

/**
 * Validates only what is visible, so Next shows inline errors exactly for the fields on screen.
 * The DL number and the licence file are both required. `today` is injectable for tests.
 */
export function createProfileSchema(today: () => Date = () => new Date()) {
  return profileFieldsSchema.superRefine((v, ctx) => {
    const { showPersonal } = getProfileVisibility(v);
    const dl = normalizeDlNumber(v.dlNumber);

    if (!dl) {
      ctx.addIssue({ code: 'custom', path: ['dlNumber'], message: e.dlRequired });
    } else if (!isValidDlNumber(dl)) {
      ctx.addIssue({ code: 'custom', path: ['dlNumber'], message: e.dlInvalid });
    }
    if (!v.dlImageUri) {
      ctx.addIssue({ code: 'custom', path: ['dlImageUri'], message: e.dlFileRequired });
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
