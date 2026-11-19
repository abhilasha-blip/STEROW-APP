import {
  FULL_NAME_MAX,
  FULL_NAME_MIN,
  MOBILE_LENGTH,
  OTP_LENGTH,
  REFERRAL_MAX,
} from '@/constants/auth';

export { MOBILE_LENGTH };

/** Parked PIN sign-in (out of navigation) still uses these. */
export const PIN_MIN_LENGTH = 4;
export const PIN_MAX_LENGTH = 6;

/** Keep only ASCII digits. */
export const digitsOnly = (value: string): string => value.replace(/\D/g, '');

/** 4–6 digit PIN (parked PIN sign-in). */
export const isValidPin = (pin: string): boolean =>
  new RegExp(`^\\d{${PIN_MIN_LENGTH},${PIN_MAX_LENGTH}}$`).test(pin);

/** Indian mobile number: 10 digits starting with 6–9. */
export const isValidIndianMobile = (phone: string): boolean => /^[6-9]\d{9}$/.test(phone);

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
