import {
  formatDob,
  isOldEnough,
  isValidDlNumber,
  isValidEmail,
  latestDobFor,
  normalizeDlNumber,
  parseIsoDate,
  toIsoDate,
} from '@/utils/validation';

describe('DL number', () => {
  it('normalizes: upper-case, alphanumerics only, max 16 chars', () => {
    expect(normalizeDlNumber('ts01 2011-0012345')).toBe('TS0120110012345');
    expect(normalizeDlNumber('ts@01#')).toBe('TS01');
    expect(normalizeDlNumber('A'.repeat(30))).toHaveLength(16);
  });

  it.each([
    ['TS0120110012345', true], // 2 letters + 13
    ['MH1420110062821', true],
    ['TS01201100123456', true], // 2 letters + 14
    ['ts01 2011 0012345', true], // normalized before checking
    ['TS012011001234', false], // 2 + 12: too short
    ['T10120110012345', false], // state code must be 2 letters
    ['1S0120110012345', false],
    ['', false],
  ])('isValidDlNumber(%s) = %s', (v, ok) => expect(isValidDlNumber(v)).toBe(ok));

  it('the 17-char Figma sample is cut to 16 as typed (designer to confirm the format)', () => {
    expect(normalizeDlNumber('TS011234567891234')).toBe('TS01123456789123');
  });
});

describe('email', () => {
  it.each([
    ['john.cooper@gmail.com', true],
    ['  john@sterow.in  ', true],
    ['a+b@x.co', true],
    ['john@gmail', false],
    ['john@@gmail.com', false],
    ['john gmail.com', false],
    ['john@.gmail.com', false],
    ['.john@gmail.com', false],
    ['john.@gmail.com', false],
    ['john..c@gmail.com', false],
    ['john@gmail.c', false],
    ['', false],
    [`${'a'.repeat(250)}@x.com`, false],
  ])('isValidEmail(%s) = %s', (v, ok) => expect(isValidEmail(v)).toBe(ok));
});

describe('date of birth', () => {
  const today = new Date(2026, 10, 19); // 19 Nov 2026

  it('converts local dates to/from ISO without time-zone shifts', () => {
    expect(toIsoDate(new Date(1990, 0, 1, 23, 59))).toBe('1990-01-01');
    expect(parseIsoDate('1990-01-31')?.getDate()).toBe(31);
    expect(parseIsoDate('1990-02-30')).toBeNull();
    expect(parseIsoDate('31-01-1990')).toBeNull();
  });

  it('formats as DD-MM-YYYY', () => {
    expect(formatDob('1990-01-01')).toBe('01-01-1990');
    expect(formatDob('2008-11-19')).toBe('19-11-2008');
    expect(formatDob(null)).toBe('');
    expect(formatDob('nope')).toBe('');
  });

  it('latest allowed DOB is today minus the minimum age (Feb 29 → Feb 28)', () => {
    expect(toIsoDate(latestDobFor(18, today))).toBe('2008-11-19');
    expect(toIsoDate(latestDobFor(18, new Date(2028, 1, 29)))).toBe('2010-02-28');
    expect(latestDobFor(18).getFullYear()).toBe(new Date().getFullYear() - 18);
  });

  it.each([
    ['2008-11-19', true], // 18 today
    ['2008-11-20', false], // 18 tomorrow
    ['1990-01-01', true],
    ['2020-01-01', false],
    ['2008-02-30', false], // not a real date
  ])('isOldEnough(%s, 18) = %s', (iso, ok) => expect(isOldEnough(iso, 18, today)).toBe(ok));

  it('defaults to the real clock', () => {
    expect(isOldEnough('1990-01-01', 18)).toBe(true);
  });
});
