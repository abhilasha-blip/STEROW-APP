/**
 * A saved document's status from its expiry date (DL, RC, Insurance, FASTag, Pollution):
 * - expired: the expiry date is before today
 * - expiringSoon: 0–EXPIRING_SOON_DAYS days left (today counts as 0)
 * - active: more than EXPIRING_SOON_DAYS days left, or no expiry date stored (FASTag never has one)
 */
export type DocumentStatus = 'active' | 'expiringSoon' | 'expired';

/** Expiring soon = expires within this many days (inclusive). */
export const EXPIRING_SOON_DAYS = 30;

const DAY_MS = 86_400_000;

/** `expiryDate` is "YYYY-MM-DD" (a longer timestamp is cut to its date); anything else counts as none. */
export function getDocumentStatus(expiryDate: string | null | undefined, today: Date = new Date()): DocumentStatus {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(expiryDate ?? '');
  if (!m) {
    return 'active';
  }
  const end = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((end - start) / DAY_MS);
  return days < 0 ? 'expired' : days <= EXPIRING_SOON_DAYS ? 'expiringSoon' : 'active';
}

/**
 * Upload / Replace / Add Manually is allowed only once the saved document has expired (or when nothing is
 * saved yet). Pollution is the exception: it is always uploadable (`alwaysUploadable`).
 */
export function canReplaceDocument(status: DocumentStatus | null, alwaysUploadable = false): boolean {
  return alwaysUploadable || status === null || status === 'expired';
}

/** "15/01/2025" (my-documents.png) from "YYYY-MM-DD". */
export const formatExpiry = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};
