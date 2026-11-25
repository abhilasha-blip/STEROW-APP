import { COUNTRIES, COUNTRY_LIST, isCountryCode } from '@/constants/countries';
import {
  display,
  formatForApi,
  isValidMobile,
  mask,
  normalizeNational,
  parseApiPhone,
  redactPhone,
} from '@/utils/phone';
import {
  digitsOnly,
  formatCountdown,
  fullNameError,
  isValidFullName,
  isValidOtp,
  isValidPin,
  isValidReferralCode,
  normalizeFullName,
  normalizeReferralCode,
  validateFullName,
} from '@/utils/validation';
import { strings } from '@/constants/strings';

describe('validation', () => {
  describe('validateFullName (one rule for Sign Up, onboarding and My Profile)', () => {
    it.each([
      'Ravi Kumar',
      "D'Souza",
      'A. B. Reddy',
      'Anne-Marie',
      '  Ravi   Kumar  ', // trimmed + collapsed
      'Al',
      'रवि कुमार', // Devanagari (letters + vowel signs)
      'प्रिया',
      'محمد علي', // Arabic
      'José Ñúñez',
      'x'.repeat(60),
    ])('valid: %s', v => {
      expect(validateFullName(v)).toBeNull();
      expect(isValidFullName(v)).toBe(true);
    });

    it.each([
      ['', 'required'],
      ['   ', 'required'],
      ['R', 'tooShort'],
      ['A.', 'tooShort'], // 2 characters but 1 letter
      ["-'", 'tooShort'], // only punctuation
      ['...', 'tooShort'],
      ['Ravi2', 'invalidChars'],
      ['Ravi_Kumar', 'invalidChars'],
      ['Ravi 😀', 'invalidChars'],
      ['Ravi@home', 'invalidChars'],
      ['x'.repeat(61), 'tooLong'],
      [`${'Ab '.repeat(20)}C`, 'tooLong'], // 61 after collapsing
    ] as const)('invalid: %s → %s', (v, error) => {
      expect(validateFullName(v)).toBe(error);
      expect(fullNameError(v)).toBe(strings.fullNameErrors[error]);
      expect(isValidFullName(v)).toBe(false);
    });

    it('the messages', () => {
      expect(strings.fullNameErrors).toEqual({
        required: 'Enter your full name',
        tooShort: 'Name must be at least 2 characters',
        invalidChars: "Name can only contain letters, spaces, . ' and -",
        tooLong: 'Name is too long',
      });
    });

    it('length is checked after trimming / collapsing spaces', () => {
      expect(validateFullName(`  ${'x'.repeat(60)}   `)).toBeNull();
      expect(validateFullName(' A  b ')).toBeNull();
    });
  });

  it('normalizes names and referral codes', () => {
    expect(normalizeFullName('  Ravi   Kumar ')).toBe('Ravi Kumar');
    expect(normalizeReferralCode('str ab12cd')).toBe('STRAB12CD');
    expect(normalizeReferralCode('a'.repeat(30))).toHaveLength(20);
  });

  it.each([
    ['', true],
    ['STRAB12CD', true],
    ['strab12cd', true],
    ['STR-AB', false],
    ['A'.repeat(21), false],
  ])('isValidReferralCode(%s) = %s', (v, ok) => expect(isValidReferralCode(v)).toBe(ok));

  it('validates a 6-digit OTP only', () => {
    expect(isValidOtp('123456')).toBe(true);
    expect(isValidOtp('1234')).toBe(false);
    expect(isValidOtp('12345a')).toBe(false);
  });

  it('keeps the parked PIN validator', () => {
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('123')).toBe(false);
  });

  it('digitsOnly and formatCountdown', () => {
    expect(digitsOnly('+91 98765-43210')).toBe('919876543210');
    expect(formatCountdown(30)).toBe('00:30');
    expect(formatCountdown(75.9)).toBe('01:15');
    expect(formatCountdown(-3)).toBe('00:00');
  });
});

describe('countries', () => {
  it('India is the default and listed first; config matches the spec', () => {
    expect(COUNTRY_LIST.map(c => c.code)).toEqual(['IN', 'AE']);
    expect(COUNTRIES.IN).toMatchObject({ dialCode: '91', flag: '🇮🇳', length: 10, stripTrunkZero: false });
    expect(COUNTRIES.AE).toMatchObject({ dialCode: '971', flag: '🇦🇪', length: 9, stripTrunkZero: true });
    expect(isCountryCode('AE')).toBe(true);
    expect(isCountryCode('US')).toBe(false);
    expect(isCountryCode('toString')).toBe(false);
  });
});

describe('phone', () => {
  it.each([
    ['9876543210', true],
    ['6000000000', true],
    ['5876543210', false],
    ['987654321', false],
    ['98765432101', false],
    ['98765abcde', false],
  ])('isValidMobile(IN, %s) = %s', (v, ok) => expect(isValidMobile('IN', v)).toBe(ok));

  it.each([
    ['501234567', true],
    ['521234567', true],
    ['541234567', true],
    ['551234567', true],
    ['561234567', true],
    ['581234567', true],
    ['531234567', false], // not a UAE mobile prefix (backend rejects it)
    ['0501234567', false], // trunk 0 must be stripped first
    ['50123456', false],
    ['5012345678', false],
    ['401234567', false],
  ])('isValidMobile(AE, %s) = %s', (v, ok) => expect(isValidMobile('AE', v)).toBe(ok));

  it('normalizes typed / pasted input per country', () => {
    expect(normalizeNational('IN', '98765-43210')).toBe('9876543210');
    expect(normalizeNational('IN', '+91 98765 43210')).toBe('9876543210');
    expect(normalizeNational('IN', '0')).toBe('0'); // India keeps a leading 0 (then fails validation)
    expect(normalizeNational('AE', '050 123 4567')).toBe('501234567');
    expect(normalizeNational('AE', '+971 50 123 4567')).toBe('501234567');
    expect(normalizeNational('AE', '0')).toBe('');
    expect(normalizeNational('AE', '5012345678')).toBe('501234567');
  });

  it('formatForApi: India = 10 digits, UAE = "971" + 9 digits (no "+", no trunk 0)', () => {
    expect(formatForApi('IN', '9876543210')).toBe('9876543210');
    expect(formatForApi('IN', '+91 98765 43210')).toBe('9876543210');
    expect(formatForApi('AE', '501234567')).toBe('971501234567');
    expect(formatForApi('AE', '0501234567')).toBe('971501234567');
    expect(formatForApi('AE', '+971 50 123 4567')).toBe('971501234567');
  });

  it('parses numbers as stored by the backend', () => {
    expect(parseApiPhone('9876543210')).toEqual({ country: 'IN', national: '9876543210' });
    expect(parseApiPhone('971501234567')).toEqual({ country: 'AE', national: '501234567' });
  });

  it('masks and displays per country', () => {
    expect(mask('IN', '9876544567')).toBe('XXXXX X4567');
    expect(mask('AE', '501234567')).toBe('+971 XX XXX 4567');
    expect(display('IN', '9876543210')).toBe('+91 98765 43210');
    expect(display('AE', '501234567')).toBe('+971 50 123 4567');
  });

  it('redacts for logs', () => {
    expect(redactPhone('9876544567')).toBe('********67');
    expect(redactPhone('1')).toBe('**');
  });
});
