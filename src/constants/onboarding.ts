/** Onboarding flow configuration. */
export const ONBOARDING_TOTAL_STEPS = 4;

/** Users must be at least this old: the DOB picker's latest selectable date is today minus this. */
export const MIN_AGE_YEARS = 18;

/**
 * Indian DL number as typed (no spaces/hyphens): 2-letter state code + 13–14 alphanumerics,
 * e.g. TS01 2011 0012345 → "TS0120110012345".
 */
export const DL_PREFIX_LETTERS = 2;
export const DL_BODY_MIN = 13;
export const DL_BODY_MAX = 14;
export const DL_MAX_LENGTH = DL_PREFIX_LETTERS + DL_BODY_MAX;

/** Upload limit for DL and profile photos (design: "Upto 10 MB"). */
export const MAX_UPLOAD_MB = 10;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

export const EMAIL_MAX_LENGTH = 254;
