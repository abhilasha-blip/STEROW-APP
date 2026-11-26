import {
  autofillValuesFromFields,
  fieldsFromAutofillValues,
  fromOcrResponse,
  mergeAutofill,
  normalizeAutofillValue,
  normalizeDate,
} from '@/utils/documentAutofill';
import { bytesToBase64, toDataUrl } from '@/utils/base64';

describe('normalizeDate → YYYY-MM-DD', () => {
  it.each([
    ['2040-01-14', '2040-01-14'],
    ['2027-08-31T00:00:00', '2027-08-31'],
    ['2027-08-31 10:00:00+05:30', '2027-08-31'],
    ['15/01/2020', '2020-01-15'],
    ['5-1-2020', '2020-01-05'],
    ['15.01.2020', '2020-01-15'],
    [' 15/01/2020 ', '2020-01-15'],
  ])('%s → %s', (input, out) => expect(normalizeDate(input)).toBe(out));

  it.each(['', 'soon', '31/02/2020', '2020-13-01', '01/2020'])('"%s" is not a date → ""', input =>
    expect(normalizeDate(input)).toBe(''),
  );
});

describe('normalizeAutofillValue', () => {
  it('DL numbers: upper-case and trimmed', () => {
    expect(normalizeAutofillValue('dlNumber', '  ts0120110012345 ')).toBe('TS0120110012345');
  });
  it('other text: trimmed, case kept; non-strings → ""', () => {
    expect(normalizeAutofillValue('insurer', ' ICICI Lombard ')).toBe('ICICI Lombard');
    expect(normalizeAutofillValue('insurer', null)).toBe('');
    expect(normalizeAutofillValue('insurer', { a: 1 })).toBe('');
    expect(normalizeAutofillValue('fastagId', 1234)).toBe('1234');
  });
});

describe('fromOcrResponse (the web contract → the form)', () => {
  it('DL: { dl_number, issued_on, valid_upto, vehicle_classes }', () => {
    expect(fromOcrResponse('dl', { dl_number: ' ts01 ', issued_on: '15/01/2020', valid_upto: '2040-01-14', vehicle_classes: ['LMV'] })).toEqual({
      dlNumber: 'TS01',
      issuedOn: '2020-01-15',
      validUpto: '2040-01-14',
    });
  });

  it('documents: the vdocs columns (insurance end_date → Valid up to); empty values dropped', () => {
    expect(fromOcrResponse('insurance', { policy_no: 'p1', insurer: '', end_date: '2027-08-31T00:00:00' })).toEqual({
      policyNo: 'P1',
      validUpto: '2027-08-31',
    });
    expect(fromOcrResponse('pollution', { certificate_no: 'puc1', validity_expiry_date: '2026-12-10' })).toEqual({
      certificateNo: 'PUC1',
      validUpto: '2026-12-10',
    });
    expect(fromOcrResponse('fastag', { fastag_id: '34161FA8' })).toEqual({ fastagId: '34161FA8' });
  });

  it('RC: columns + aliases; make + model joined', () => {
    expect(
      fromOcrResponse('rc', { rc_number: 'ts09ev2345', reg_date: '2023-03-20', color: 'Black', make: 'MG', model: 'ZS EV', fuel_type: 'Electric' }),
    ).toEqual({ registrationNumber: 'TS09EV2345', regDate: '2023-03-20', colour: 'Black', makeModel: 'MG ZS EV', fuelType: 'Electric' });
  });

  it('unknown keys are ignored', () => {
    expect(fromOcrResponse('dl', { name: 'X', address: 'Y' })).toEqual({});
  });
});

describe('mergeAutofill: a read value replaces a form value only if non-empty', () => {
  it('keeps what the user had when the document has nothing for it', () => {
    const { values, filled } = mergeAutofill(
      { dlNumber: 'TS01', issuedOn: '2020-01-15', validUpto: '' },
      { dlNumber: 'TS0120110012345', issuedOn: '', validUpto: '2040-01-14' },
    );
    expect(values).toEqual({ dlNumber: 'TS0120110012345', issuedOn: '2020-01-15', validUpto: '2040-01-14' });
    expect(filled).toEqual(['dlNumber', 'validUpto']);
  });
  it('nothing read → nothing changes', () => {
    expect(mergeAutofill({ policyNo: 'A' }, {})).toEqual({ values: { policyNo: 'A' }, filled: [] });
  });
});

describe('card details ↔ review form', () => {
  it('RC: the vehicle number prefills; confirmed values become the RC columns (fuel as the web saves it)', () => {
    expect(autofillValuesFromFields('rc', null, 'TS09EV2345').registrationNumber).toBe('TS09EV2345');
    const fields = fieldsFromAutofillValues(
      'rc',
      { registrationNumber: 'ts09 ev 2345', regDate: '2023-03-20', validUpto: '', fuelType: 'electric', colour: ' Black ', chassisNumber: 'MZ1', engineNumber: '', makeModel: 'MG ZS EV' },
      null,
    );
    expect(fields.registrationNumber).toBe('TS09EV2345');
    expect(fields.rc).toMatchObject({ regDate: '2023-03-20', validUpto: null, fuelType: 'Electric', colour: 'Black', chassisNumber: 'MZ1', makeModel: 'MG ZS EV' });
  });

  it('insurance: Valid up to ↔ expiry; other saved details are kept', () => {
    expect(autofillValuesFromFields('insurance', { policyNo: 'P', insurer: 'I', expiry: '2027-01-01' })).toEqual({
      policyNo: 'P',
      insurer: 'I',
      validUpto: '2027-01-01',
    });
    expect(fieldsFromAutofillValues('insurance', { policyNo: 'P2', insurer: 'I2', validUpto: '' }, { policyNo: 'P' })).toEqual({
      policyNo: 'P2',
      insurer: 'I2',
      expiry: null,
    });
  });
});

describe('base64 / data URL', () => {
  it.each([
    ['', ''],
    ['a', 'YQ=='],
    ['ab', 'YWI='],
    ['abc', 'YWJj'],
    ['abcd', 'YWJjZA=='],
    ['Sterow', 'U3Rlcm93'],
  ])('"%s" → %s (RFC 4648, every padding case)', (text, b64) => {
    expect(bytesToBase64(Uint8Array.from(text, c => c.charCodeAt(0)))).toBe(b64);
  });
  it('high bytes', () => {
    expect(bytesToBase64(new Uint8Array([0xe2, 0x9c, 0x93, 0xff]))).toBe('4pyT/w==');
  });
  it('data:<mime>;base64,… (as FileReader.readAsDataURL)', () => {
    expect(toDataUrl('image/jpeg', new Uint8Array([255, 216, 255]))).toBe('data:image/jpeg;base64,/9j/');
  });
});
