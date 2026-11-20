import { COUNTRIES, type CountryCode } from '@/constants/countries';
import { digitsOnly } from './validation';

/**
 * Normalises what the user typed/pasted into the national number for `country`:
 * digits only, an international prefix (+91 / +971) dropped, a UAE trunk 0 stripped,
 * capped at the country's length.
 */
export const normalizeNational = (country: CountryCode, input: string): string => {
  const c = COUNTRIES[country];
  let d = digitsOnly(input);
  if (d.length > c.length && d.startsWith(c.dialCode)) {
    d = d.slice(c.dialCode.length);
  }
  if (c.stripTrunkZero) {
    d = d.replace(/^0+/, '');
  }
  return d.slice(0, c.length);
};

export const isValidMobile = (country: CountryCode, national: string): boolean =>
  COUNTRIES[country].pattern.test(national);

/**
 * THE single place that decides the phone format sent to the APP server.
 * Confirmed from the web bundles (2026-11-19, `phone-*.js` + `phone-otp-form-*.js`):
 *   India → 10 national digits, no prefix: "9876543210"
 *   UAE   → "971" + 9 digits, no "+", no trunk 0: "971501234567"
 * No separate country field is sent; the prefix carries it.
 */
export const formatForApi = (country: CountryCode, national: string): string => {
  const n = normalizeNational(country, national);
  return country === 'IN' ? n : `${COUNTRIES[country].dialCode}${n}`;
};

/** Infers the country of a number as stored by the backend (e.g. user_details.phone). */
export const parseApiPhone = (stored: string): { country: CountryCode; national: string } => {
  const d = digitsOnly(stored);
  if (d.length === 12 && d.startsWith(COUNTRIES.AE.dialCode)) {
    return { country: 'AE', national: d.slice(COUNTRIES.AE.dialCode.length) };
  }
  return { country: 'IN', national: d.slice(-COUNTRIES.IN.length) };
};

/**
 * Masked for display, keeping the last 4 digits:
 *   IN "9876544567" → "XXXXX X4567" (the Figma copy) · AE "501234567" → "+971 XX XXX 4567"
 */
export const mask = (country: CountryCode, national: string): string => {
  const last4 = digitsOnly(national).slice(-4);
  return country === 'IN' ? `XXXXX X${last4}` : `+${COUNTRIES[country].dialCode} XX XXX ${last4}`;
};

/** Full number for display: IN "+91 98765 43210" · AE "+971 50 123 4567". */
export const display = (country: CountryCode, national: string): string => {
  const n = normalizeNational(country, national);
  const groups = country === 'IN' ? [n.slice(0, 5), n.slice(5)] : [n.slice(0, 2), n.slice(2, 5), n.slice(5)];
  return [`+${COUNTRIES[country].dialCode}`, ...groups.filter(Boolean)].join(' ');
};

/** For logs: keeps only the last 2 digits. */
export const redactPhone = (phone: string): string => {
  const d = digitsOnly(phone);
  return d.length <= 2 ? '**' : `${'*'.repeat(d.length - 2)}${d.slice(-2)}`;
};
