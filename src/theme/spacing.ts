/** 4-pt spacing scale plus named layout constants (design frame: 402 x 874 pt). */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  screenPaddingH: 24,
} as const;

export type Spacing = typeof spacing;

/** Component sizes measured from the Figma frames. */
export const sizes = {
  inputHeight: 56,
  inputPaddingH: 20,
  buttonHeight: 56,
  biometricHeight: 64,
  biometricIcon: 20,
  backButton: 48,
  backIcon: 24,
  otpBoxHeight: 56,
  otpGap: 16,
  logoWidth: 200,
  logoHeight: 60,
  arrowIconWidth: 14,
  arrowIconHeight: 12,
  minTouchTarget: 44,

  // Onboarding (design/onboarding, 402 pt wide frames).
  inputHeightLight: 48,
  /** Inner padding of light fields (16) – the 1pt border makes the text start 17pt in. */
  inputPaddingLight: 16,
  progressHeight: 8,
  avatarLarge: 120,
  avatarGrid: 64,
  avatarBadge: 36,
  /** Round X buttons (sheet close, remove upload). */
  iconButtonSmall: 32,
  /** Calendar, upload, pencil, close glyphs. */
  iconSmall: 16,
  uploadBoxHeight: 218,
} as const;

export type Sizes = typeof sizes;
