import { canReplaceDocument, EXPIRING_SOON_DAYS, formatExpiry, getDocumentStatus } from '@/utils/documentStatus';

const today = new Date(2026, 10, 26, 18, 30); // the time of day doesn't matter

describe('getDocumentStatus', () => {
  it('Expired: the expiry date is before today', () => {
    expect(getDocumentStatus('2026-11-25', today)).toBe('expired');
    expect(getDocumentStatus('2020-01-01', today)).toBe('expired');
  });

  it(`Expiring soon: 0–${EXPIRING_SOON_DAYS} days left (today included)`, () => {
    expect(getDocumentStatus('2026-11-26', today)).toBe('expiringSoon'); // 0 days
    expect(getDocumentStatus('2026-11-27', today)).toBe('expiringSoon');
    expect(getDocumentStatus('2026-12-26', today)).toBe('expiringSoon'); // 30 days
  });

  it('Active: more than 30 days left', () => {
    expect(getDocumentStatus('2026-12-27', today)).toBe('active'); // 31 days
    expect(getDocumentStatus('2040-05-15', today)).toBe('active');
  });

  it('no expiry date (FASTag, or none stored yet) → Active', () => {
    expect(getDocumentStatus(null, today)).toBe('active');
    expect(getDocumentStatus(undefined, today)).toBe('active');
    expect(getDocumentStatus('', today)).toBe('active');
    expect(getDocumentStatus('not a date', today)).toBe('active');
  });

  it('a timestamp counts by its date', () => {
    expect(getDocumentStatus('2026-11-25T23:59:59', today)).toBe('expired');
    expect(getDocumentStatus('2038-03-20T00:00:00+00:00', today)).toBe('active');
  });

  it('crosses a DST change / month end without an off-by-one', () => {
    expect(getDocumentStatus('2027-04-01', new Date(2027, 2, 2))).toBe('expiringSoon'); // 30 days over 31 March
    expect(getDocumentStatus('2027-04-02', new Date(2027, 2, 2))).toBe('active');
  });
});

describe('canReplaceDocument', () => {
  it('only an expired document (or none saved) can be replaced', () => {
    expect(canReplaceDocument('expired')).toBe(true);
    expect(canReplaceDocument(null)).toBe(true);
    expect(canReplaceDocument('active')).toBe(false);
    expect(canReplaceDocument('expiringSoon')).toBe(false);
  });

  it('Pollution is always uploadable', () => {
    expect(canReplaceDocument('active', true)).toBe(true);
    expect(canReplaceDocument('expiringSoon', true)).toBe(true);
  });
});

it('formatExpiry: DD/MM/YYYY', () => {
  expect(formatExpiry('2025-01-15')).toBe('15/01/2025');
  expect(formatExpiry('2038-03-20T00:00:00')).toBe('20/03/2038');
});
