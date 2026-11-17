/**
 * Typography tokens. No colours here.
 *
 * Font files live in src/assets/fonts and are named after their PostScript
 * names, so the same `fontFamily` string works on iOS and Android.
 * NEVER combine `fontWeight` with a custom fontFamily – pick the weight via
 * the family instead (it breaks on Android otherwise).
 */
export const fontFamily = {
  regular: 'PlusJakartaSans-Regular',
  medium: 'PlusJakartaSans-Medium',
  semiBold: 'PlusJakartaSans-SemiBold',
  bold: 'PlusJakartaSans-Bold',
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  display: 34,
} as const;

export const lineHeight = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 26,
  xl: 30,
  xxl: 36,
  display: 42,
} as const;

export const typography = { fontFamily, fontSize, lineHeight } as const;
export type Typography = typeof typography;
