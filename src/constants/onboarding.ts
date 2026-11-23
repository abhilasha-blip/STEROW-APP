/** Onboarding flow: 1/3 My Profile → 2/3 Driving Licence → 3/3 Documents → Dashboard. */
export const ONBOARDING_TOTAL_STEPS = 3;
export const ONBOARDING_STEP = { profile: 1, drivingLicence: 2, documents: 3 } as const;

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

/**
 * Indian registration number as typed (upper-case, no spaces): state code, 1–2 digit RTO, 0–3 letter
 * series, 4 digits ("TS09EV1234", "DL1CAB1234"), or the BH series ("22BH1234AB"). Up to 11 characters.
 */
export const VEHICLE_NUMBER_MAX_LENGTH = 11;
export const VEHICLE_NUMBER_PATTERN = /^(?:[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{4}|\d{2}BH\d{4}[A-Z]{1,2})$/;

export const FUEL_TYPES = ['petrol', 'diesel', 'electric', 'cng', 'hybrid'] as const;
export type FuelType = (typeof FUEL_TYPES)[number];
export const TRANSMISSIONS = ['manual', 'automatic', 'cvt'] as const;
export type Transmission = (typeof TRANSMISSIONS)[number];
export const VEHICLE_COLOUR_MAX_LENGTH = 30;

/** 3/3 documents, in screen order (the DL has its own step, 2/3). */
export const DOCUMENT_KEYS = ['rc', 'insurance', 'pollution'] as const;
export type DocumentKey = (typeof DOCUMENT_KEYS)[number];
/**
 * 3/3 "Next" rule: how many documents must be attached. ASSUMPTION (no rule in the design):
 * at least one. Change here only.
 */
export const MIN_DOCUMENTS_TO_CONTINUE = 1;
