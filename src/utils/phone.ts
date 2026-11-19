import { digitsOnly } from './validation';

/**
 * THE single place that decides the phone format sent to the APP server.
 * Confirmed live (2026-11-19): 10 national digits, no +91 (same as the web).
 */
export const formatForApi = (phone: string): string => digitsOnly(phone).slice(-10);

/** "9876544567" -> "XXXXX X4567" (the format used in the Figma copy). */
export const mask = (phone: string): string => `XXXXX X${digitsOnly(phone).slice(-4)}`;

/** For logs: keeps only the last 2 digits. */
export const redactPhone = (phone: string): string => {
  const d = digitsOnly(phone);
  return d.length <= 2 ? '**' : `${'*'.repeat(d.length - 2)}${d.slice(-2)}`;
};
