import { mask, formatForApi, redactPhone } from '@/utils/phone';
import {
  digitsOnly,
  formatCountdown,
  isValidFullName,
  isValidIndianMobile,
  isValidOtp,
  isValidPin,
  isValidReferralCode,
  normalizeFullName,
  normalizeReferralCode,
} from '@/utils/validation';

describe('validation', () => {
  it.each([
    ['9876543210', true],
    ['6000000000', true],
    ['5876543210', false],
    ['987654321', false],
    ['98765432101', false],
    ['98765abcde', false],
  ])('isValidIndianMobile(%s) = %s', (v, ok) => expect(isValidIndianMobile(v)).toBe(ok));

  it.each([
    ['Ravi Kumar', true],
    ["D'Souza", true],
    ['A. B. Reddy', true],
    ['Anne-Marie', true],
    ['  Ravi   Kumar  ', true],
    ['R', false],
    ['', false],
    ['Ravi2', false],
    ['-Ravi', false],
    ['x'.repeat(61), false],
    ['रवि कुमार', true],
  ])('isValidFullName(%s) = %s', (v, ok) => expect(isValidFullName(v)).toBe(ok));

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

describe('phone', () => {
  it('formats for the API as 10 digits without +91', () => {
    expect(formatForApi('9876543210')).toBe('9876543210');
    expect(formatForApi('+91 98765 43210')).toBe('9876543210');
  });
  it('masks for display and logs', () => {
    expect(mask('9876544567')).toBe('XXXXX X4567');
    expect(redactPhone('9876544567')).toBe('********67');
    expect(redactPhone('1')).toBe('**');
  });
});
