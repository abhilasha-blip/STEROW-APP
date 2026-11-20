import { formatIndianNumber, isValidVehicleNumber, normalizeVehicleNumber } from '../validation';

describe('vehicle number', () => {
  it('normalises as typed: upper-case, alphanumerics only, max 11', () => {
    expect(normalizeVehicleNumber('ts 09 ev-1234')).toBe('TS09EV1234');
    expect(normalizeVehicleNumber('KA01AB12345678')).toBe('KA01AB12345');
  });

  it.each(['TS09EV1234', 'DL1CAB1234', 'MH12A1234', 'KA011234', '22BH1234AB', 'ts09ev1234'])(
    'accepts %s',
    n => expect(isValidVehicleNumber(n)).toBe(true),
  );

  it.each(['', 'TS09', 'TS09EV123', '1234TS09EV', 'TS09ABCD1234', '22BH1234'])('rejects %s', n =>
    expect(isValidVehicleNumber(n)).toBe(false),
  );
});

describe('formatIndianNumber', () => {
  it.each([
    ['', ''],
    ['7', '7'],
    ['999', '999'],
    ['1000', '1,000'],
    ['123456', '1,23,456'],
    ['1234567', '12,34,567'],
    ['123456789', '12,34,56,789'],
    ['000450', '450'],
    ['0', '0'],
    ['1,23,456', '1,23,456'],
  ])('%s → %s', (input, out) => expect(formatIndianNumber(input)).toBe(out));
});
