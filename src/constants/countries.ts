/**
 * Supported phone countries: THE single source of truth (dial code, flag, length, validation).
 * The API format lives only in `utils/phone.ts#formatForApi`.
 */
export type CountryCode = 'IN' | 'AE';

export type Country = {
  code: CountryCode;
  /** Digits only, no "+": what the API prefixes for non-default countries. */
  dialCode: string;
  flag: string;
  /** National significant number length (what the user types). */
  length: number;
  /** Validates the national number (digits only, trunk 0 already stripped). */
  pattern: RegExp;
  /** Strip a leading trunk "0" as the user types (e.g. UAE "050 123 4567"). */
  stripTrunkZero: boolean;
};

export const COUNTRIES: Record<CountryCode, Country> = {
  IN: {
    code: 'IN',
    dialCode: '91',
    flag: '🇮🇳',
    length: 10,
    pattern: /^[6-9]\d{9}$/,
    stripTrunkZero: false,
  },
  AE: {
    code: 'AE',
    dialCode: '971',
    flag: '🇦🇪',
    length: 9,
    // Mobile prefixes 50/52/54/55/56/58: the same rule as the web app and backend (/^9715[024568]\d{7}$/).
    pattern: /^5[024568]\d{7}$/,
    stripTrunkZero: true,
  },
};

/** Display order in the picker. */
export const COUNTRY_LIST: readonly Country[] = [COUNTRIES.IN, COUNTRIES.AE];

export const DEFAULT_COUNTRY: CountryCode = 'IN';

export const isCountryCode = (value: unknown): value is CountryCode =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(COUNTRIES, value);
