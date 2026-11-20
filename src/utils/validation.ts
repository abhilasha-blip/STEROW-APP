import {
  FULL_NAME_MAX,
  FULL_NAME_MIN,
  OTP_LENGTH,
  REFERRAL_MAX,
} from '@/constants/auth';
import {
  DL_BODY_MAX,
  DL_BODY_MIN,
  DL_MAX_LENGTH,
  DL_PREFIX_LETTERS,
  EMAIL_MAX_LENGTH,
  VEHICLE_NUMBER_MAX_LENGTH,
  VEHICLE_NUMBER_PATTERN,
} from '@/constants/onboarding';

/** Parked PIN sign-in (out of navigation) still uses these. */
export const PIN_MIN_LENGTH = 4;
export const PIN_MAX_LENGTH = 6;

/** Keep only ASCII digits. */
export const digitsOnly = (value: string): string => value.replace(/\D/g, '');

/** 4–6 digit PIN (parked PIN sign-in). */
export const isValidPin = (pin: string): boolean =>
  new RegExp(`^\\d{${PIN_MIN_LENGTH},${PIN_MAX_LENGTH}}$`).test(pin);

/** Full name: 2–60 chars, letters (incl. combining marks, e.g. Devanagari vowel signs), spaces and . ' - only, starting with a letter. */
export const isValidFullName = (name: string): boolean => {
  const n = name.trim().replace(/\s+/g, ' ');
  return (
    n.length >= FULL_NAME_MIN &&
    n.length <= FULL_NAME_MAX &&
    /^\p{L}[\p{L}\p{M} .'-]*$/u.test(n)
  );
};

/** Collapses inner whitespace and trims: what we send to the API. */
export const normalizeFullName = (name: string): string => name.trim().replace(/\s+/g, ' ');

/** Referral codes are upper-case alphanumerics; spaces are dropped as the user types. */
export const normalizeReferralCode = (code: string): string =>
  code.replace(/\s/g, '').toUpperCase().slice(0, REFERRAL_MAX);

/** Optional: empty is valid. */
export const isValidReferralCode = (code: string): boolean =>
  code === '' || new RegExp(`^[A-Z0-9]{1,${REFERRAL_MAX}}$`).test(code.toUpperCase());

/** Exactly OTP_LENGTH digits. */
export const isValidOtp = (code: string): boolean =>
  new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code);

/** 12 -> "00:12" */
export const formatCountdown = (totalSeconds: number): string => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
};

// ── Onboarding: DL number, email, date of birth ──────────────────────────────────────────────

/** Upper-cases and drops everything but A–Z / 0–9 (users often type "TS01 2011…" or "TS-01-…"). */
export const normalizeDlNumber = (value: string): string =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, DL_MAX_LENGTH);

const DL_PATTERN = new RegExp(
  `^[A-Z]{${DL_PREFIX_LETTERS}}[A-Z0-9]{${DL_BODY_MIN},${DL_BODY_MAX}}$`,
);

/** Indian DL: 2-letter state code + 13–14 alphanumerics (15–16 chars after normalising). */
export const isValidDlNumber = (value: string): boolean => DL_PATTERN.test(normalizeDlNumber(value));

/**
 * Pragmatic email check (the server is the source of truth): one "@", no spaces, a dot in the
 * domain, a 2+ letter TLD, no leading/trailing/double dots.
 */
export const isValidEmail = (value: string): boolean => {
  const v = value.trim();
  return (
    v.length <= EMAIL_MAX_LENGTH &&
    /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(v) &&
    !/\.\./.test(v) &&
    !/^\.|\.@|@\./.test(v)
  );
};

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Local calendar date → "YYYY-MM-DD" (no time zone shift, unlike toISOString()). */
export const toIsoDate = (date: Date): string =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

/** "YYYY-MM-DD" → local Date at midnight, or null when it isn't a real calendar date. */
export const parseIsoDate = (iso: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) {
    return null;
  }
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d
    ? date
    : null;
};

/** "1990-01-31" → "31-01-1990" (the design's DD-MM-YYYY). Invalid input → "". */
export const formatDob = (iso: string | null | undefined): string => {
  const date = iso ? parseIsoDate(iso) : null;
  return date ? `${pad2(date.getDate())}-${pad2(date.getMonth() + 1)}-${date.getFullYear()}` : '';
};

/** Latest birth date that is at least `minAge` years before `today` (Feb 29 → Feb 28). */
export const latestDobFor = (minAge: number, today: Date = new Date()): Date => {
  const y = today.getFullYear() - minAge;
  const m = today.getMonth();
  const lastDay = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(today.getDate(), lastDay));
};

/** True when the ISO date is a real date and the person is at least `minAge` today. */
export const isOldEnough = (iso: string, minAge: number, today: Date = new Date()): boolean => {
  const date = parseIsoDate(iso);
  return !!date && date.getTime() <= latestDobFor(minAge, today).getTime();
};

/** Vehicle registration number as typed: upper-case A–Z / 0–9 only ("ts 09 ev-1234" → "TS09EV1234"). */
export const normalizeVehicleNumber = (value: string): string =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, VEHICLE_NUMBER_MAX_LENGTH);

/** Indian registration number (standard "TS09EV1234" or BH series "22BH1234AB"). */
export const isValidVehicleNumber = (value: string): boolean =>
  VEHICLE_NUMBER_PATTERN.test(normalizeVehicleNumber(value));

/** Indian digit grouping for a string of digits: "123456" → "1,23,456", "1234567" → "12,34,567". */
export const formatIndianNumber = (digits: string): string => {
  const d = digitsOnly(digits).replace(/^0+(?=\d)/, '');
  if (d.length <= 3) {
    return d;
  }
  const last3 = d.slice(-3);
  const rest = d.slice(0, -3).replace(/\B(?=(\d{2})+$)/g, ',');
  return `${rest},${last3}`;
};
