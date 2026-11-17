/** Corner radii. */
export const radius = {
  none: 0,
  sm: 8,
  md: 12,
  card: 16,
  otpBox: 16,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export type Radius = typeof radius;
