import { strings } from '@/constants/strings';
import {
  createDrivingLicenceSchema,
  EMPTY_DRIVING_LICENCE,
  showDlOr,
  type DrivingLicenceFormValues,
} from '../schemas/drivingLicence.schema';

const e = strings.onboarding.errors;
const schema = createDrivingLicenceSchema(() => new Date(2026, 10, 19));
const FILE = 'file:///dl.jpg';
const ok: DrivingLicenceFormValues = { ...EMPTY_DRIVING_LICENCE, dlNumber: 'TS0120110012345', dlImageUri: FILE };

const issues = (v: DrivingLicenceFormValues) => {
  const r = schema.safeParse(v);
  return r.success ? {} : Object.fromEntries(r.error.issues.map(i => [i.path.join('.'), i.message]));
};

describe('driving licence schema (2/3)', () => {
  it('needs the licence number AND the licence file (web wording)', () => {
    expect(issues(EMPTY_DRIVING_LICENCE)).toEqual({ dlNumber: e.dlRequired, dlImageUri: e.dlFileRequired });
    expect(e.dlRequired).toBe('Enter the licence number');
    expect(e.dlFileRequired).toBe('Upload a photo or PDF of your licence');
  });

  it('rejects an incomplete number', () => {
    expect(issues({ ...ok, dlNumber: 'TS01' })).toEqual({ dlNumber: e.dlInvalid });
  });

  it('dates are optional', () => {
    expect(issues(ok)).toEqual({});
    expect(issues({ ...ok, issuedOn: '2020-01-15' })).toEqual({});
    expect(issues({ ...ok, validUpto: '2040-01-14' })).toEqual({});
    expect(issues({ ...ok, issuedOn: '2020-01-15', validUpto: '2040-01-14' })).toEqual({});
  });

  it('Issued on is not in the future; Valid up to is after Issued on', () => {
    expect(issues({ ...ok, issuedOn: '2026-11-19' })).toEqual({});
    expect(issues({ ...ok, issuedOn: '2026-11-20' })).toEqual({ issuedOn: e.issuedInFuture });
    expect(issues({ ...ok, issuedOn: '2020-01-15', validUpto: '2020-01-15' })).toEqual({ validUpto: e.validUptoBeforeIssued });
    expect(issues({ ...ok, issuedOn: '2020-01-15', validUpto: '2019-12-31' })).toEqual({ validUpto: e.validUptoBeforeIssued });
  });

  it('"Or" only when OCR can read the upload', () => {
    expect(showDlOr()).toBe(false);
    expect(showDlOr(true)).toBe(true);
  });
});
