/** Corner radii. */
export const radius = {
  none: 0,
  sm: 8,
  md: 12,
  card: 16,
  otpBox: 16,
  lg: 16,
  xl: 24,
  /** Onboarding light inputs and the upload box. */
  field: 8,
  /** Uploaded licence preview inside the upload box. */
  preview: 15,
  /** Top corners of the light content sheet and the light bottom sheet. */
  sheet: 20,
  pill: 999,
} as const;

export type Radius = typeof radius;
