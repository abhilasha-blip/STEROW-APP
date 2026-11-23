import { z } from 'zod';
import { strings } from '@/constants/strings';
import { toIsoDate, isValidDlNumber, normalizeDlNumber, parseIsoDate } from '@/utils/validation';

const e = strings.onboarding.errors;

/** 2/3 "Driving Licence" form state. */
export const drivingLicenceFieldsSchema = z.object({
  /** Normalised as typed: upper-case A–Z/0–9 only. */
  dlNumber: z.string(),
  /**
   * The licence photo: a local file uri (picked now, uploaded on Next) or the signed URL of the file
   * already saved (not re-uploaded).
   */
  dlImageUri: z.string().nullable(),
  /** "YYYY-MM-DD" or null (optional, as on the web). */
  issuedOn: z.string().nullable(),
  /** "YYYY-MM-DD" or null (optional, as on the web). */
  validUpto: z.string().nullable(),
});
export type DrivingLicenceFormValues = z.infer<typeof drivingLicenceFieldsSchema>;

export const EMPTY_DRIVING_LICENCE: DrivingLicenceFormValues = {
  dlNumber: '',
  dlImageUri: null,
  issuedOn: null,
  validUpto: null,
};

/** "Or" between the number and the upload only when OCR can read the number from the upload. */
export const showDlOr = (ocrAvailable = false) => ocrAvailable;

/**
 * Number + file are required (as on the web). Dates are optional; when given: Issued on is not in the
 * future, and Valid up to is after Issued on. `today` is injectable for tests.
 */
export function createDrivingLicenceSchema(today: () => Date = () => new Date()) {
  return drivingLicenceFieldsSchema.superRefine((v, ctx) => {
    const dl = normalizeDlNumber(v.dlNumber);
    if (!dl) {
      ctx.addIssue({ code: 'custom', path: ['dlNumber'], message: e.dlRequired });
    } else if (!isValidDlNumber(dl)) {
      ctx.addIssue({ code: 'custom', path: ['dlNumber'], message: e.dlInvalid });
    }
    if (!v.dlImageUri) {
      ctx.addIssue({ code: 'custom', path: ['dlImageUri'], message: e.dlFileRequired });
    }
    const issued = v.issuedOn ? parseIsoDate(v.issuedOn) : null;
    const valid = v.validUpto ? parseIsoDate(v.validUpto) : null;
    if (v.issuedOn && issued && v.issuedOn > toIsoDate(today())) {
      ctx.addIssue({ code: 'custom', path: ['issuedOn'], message: e.issuedInFuture });
    }
    if (issued && valid && v.validUpto! <= v.issuedOn!) {
      ctx.addIssue({ code: 'custom', path: ['validUpto'], message: e.validUptoBeforeIssued });
    }
  });
}
