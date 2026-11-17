export const PIN_MIN_LENGTH = 4;
export const PIN_MAX_LENGTH = 6;
export const MOBILE_LENGTH = 10;
export const OTP_LENGTH = 4;

/** Keep only ASCII digits. */
export const digitsOnly = (value: string): string => value.replace(/\D/g, '');

/** 4–6 digit PIN. */
export const isValidPin = (pin: string): boolean =>
  new RegExp(`^\\d{${PIN_MIN_LENGTH},${PIN_MAX_LENGTH}}$`).test(pin);

/** Indian mobile number: 10 digits starting with 6–9. */
export const isValidIndianMobile = (phone: string): boolean => /^[6-9]\d{9}$/.test(phone);

/** 4-digit OTP. */
export const isValidOtp = (code: string): boolean => new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code);

/** "9876543210" -> "XXXXX X3210" (the format used in the Figma copy). */
export const maskPhone = (phone: string): string => `XXXXX X${digitsOnly(phone).slice(-4)}`;

/** 12 -> "00:12" */
export const formatCountdown = (totalSeconds: number): string => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
};
