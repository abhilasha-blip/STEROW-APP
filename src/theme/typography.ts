import type { TextStyle } from 'react-native';

/**
 * Typography tokens (Plus Jakarta Sans). No colours here – components combine a
 * variant with a colour token.
 *
 * Font files live in src/assets/fonts and are named after their PostScript
 * names, so the same `fontFamily` string works on iOS and Android.
 * NEVER combine `fontWeight` with a custom fontFamily – pick the weight via
 * the family instead (it breaks on Android otherwise).
 *
 * Sizes were recovered from the Figma frames by fitting each string's ink
 * width against the font's glyph metrics.
 */
export const fontFamily = {
  regular: 'PlusJakartaSans-Regular',
  medium: 'PlusJakartaSans-Medium',
  semiBold: 'PlusJakartaSans-SemiBold',
  bold: 'PlusJakartaSans-Bold',
} as const;

type Variant = Pick<TextStyle, 'fontFamily' | 'fontSize' | 'lineHeight' | 'letterSpacing'>;

const v = (
  family: string,
  fontSize: number,
  lineHeight?: number,
  letterSpacing?: number,
): Variant => ({
  fontFamily: family,
  fontSize,
  ...(lineHeight !== undefined && { lineHeight }),
  ...(letterSpacing !== undefined && { letterSpacing }),
});

export const variants = {
  /** "Sign In", "Create Account", "Verify OTP" */
  screenTitle: v(fontFamily.semiBold, 24, 32),
  /** Sign In subtitle */
  subtitle: v(fontFamily.regular, 14, 20),
  /** Create Account subtitle, OTP description */
  bodyLarge: v(fontFamily.regular, 16, 19),
  /** "PIN", "Mobile Number", "Code" */
  label: v(fontFamily.regular, 16, 20),
  /** PIN field text + placeholder (no lineHeight: it misaligns TextInput) */
  input: v(fontFamily.regular, 16),
  /** Mobile field text, placeholder and "+91" prefix */
  inputLarge: v(fontFamily.regular, 18),
  /** Primary button label */
  button: v(fontFamily.medium, 18, 24),
  /** "Or Log in with", "Don't have an account?" */
  small: v(fontFamily.regular, 15, 20, 0.2),
  /** "Sign up" link */
  smallStrong: v(fontFamily.medium, 15, 20),
  /** "Resend code in" */
  caption: v(fontFamily.regular, 14, 20, 0.15),
  /** Countdown "00:12" / "Resend code" */
  captionStrong: v(fontFamily.medium, 15, 20),
  /** Biometric button labels */
  biometric: v(fontFamily.medium, 16, 20),
  /** OTP box digit */
  otpDigit: v(fontFamily.semiBold, 22, 28),
  /** Inline field errors */
  error: v(fontFamily.regular, 13, 18),

  // Onboarding (design/onboarding – sizes and weights fitted from the outlined glyphs).
  /** Current step "1" in "1/4" */
  stepCurrent: v(fontFamily.bold, 16, 20),
  /** "/4" */
  stepTotal: v(fontFamily.regular, 14, 20),
  /** Light field labels: "DL Number", "Full Name", "Upload your DL"; also "Or" */
  fieldLabel: v(fontFamily.regular, 14, 18),
  /** Light field text + placeholder (no lineHeight: it misaligns TextInput) */
  inputSmall: v(fontFamily.regular, 14),
  /** "Profile image" */
  avatarLabel: v(fontFamily.medium, 16, 20),
  /** "Edit Profile Image" */
  sheetTitle: v(fontFamily.semiBold, 16, 20),
  /** "Next", "Select" (onboarding buttons are SemiBold; auth buttons stay Medium) */
  buttonStrong: v(fontFamily.semiBold, 18, 24),
  /** "Skip for now", "Cancel" */
  link: v(fontFamily.bold, 14, 20),
  /** "Browse File" */
  linkSmall: v(fontFamily.semiBold, 14, 20),
  /** "Upload DL image" */
  body: v(fontFamily.regular, 14, 20),
  /** "JPEG, PNG … Upto 10 MB" */
  hint: v(fontFamily.regular, 12, 16),
  /** Unselected chip ("Petrol"). */
  chip: v(fontFamily.regular, 14, 18),
  /** Selected chip ("Electric ✓"). */
  chipSelected: v(fontFamily.semiBold, 14, 18),

  // design/dashboard (sizes fitted from the glyph outlines' heights in the SVG exports).
  /** "Welcome John!" */
  welcome: v(fontFamily.semiBold, 26, 32),
  /** The email under it, drawer email. */
  welcomeEmail: v(fontFamily.regular, 15, 20),
  /** Vehicle card name ("MG ZS EV"), tile titles, document names. */
  cardTitle: v(fontFamily.semiBold, 16, 20),
  /** Vehicle number, row subtitles. */
  cardSubtitle: v(fontFamily.regular, 14, 18),
  /** "2 Available", "1 Pending". */
  count: v(fontFamily.medium, 14, 18),
  /** "Quick Links", "Document List", "Personal Information". */
  sectionTitle: v(fontFamily.semiBold, 20, 26),
  /** Smaller section titles on the light screens ("Personal Information"). */
  sectionTitleSmall: v(fontFamily.semiBold, 16, 20),
  /** Quick link labels, pill text. */
  tiny: v(fontFamily.regular, 12, 15),
  tinyStrong: v(fontFamily.medium, 12, 15),
  /** Bottom tab labels. */
  tab: v(fontFamily.regular, 12, 16),
  tabActive: v(fontFamily.semiBold, 12, 16),
  /** "Check your vehicle health". */
  bannerTitle: v(fontFamily.semiBold, 22, 26),
  /** "80%" in the health ring. */
  ringValue: v(fontFamily.bold, 24, 28),
  /** Drawer name. */
  drawerName: v(fontFamily.semiBold, 22, 28),
  /** Drawer rows. */
  drawerRow: v(fontFamily.regular, 16, 20),
  /** Back-arrow headers ("My Documents"). */
  headerTitle: v(fontFamily.semiBold, 20, 26),
  /** Document cards on onboarding 3/3 ("Registration Certificate (RC)"). */
  documentTitle: v(fontFamily.semiBold, 17, 22),
  /** "Upload File" / "Add Manually". */
  tileAction: v(fontFamily.semiBold, 15, 20),

  // design/book-service (sizes fitted from the outlined glyph heights, 402pt frames).
  /** Stepper numbers inside the 32pt circles. */
  stepNumber: v(fontFamily.semiBold, 14, 18),
  /** Stepper labels: done / current (SemiBold) and upcoming (Regular). */
  stepLabel: v(fontFamily.semiBold, 12, 16),
  stepLabelMuted: v(fontFamily.regular, 12, 16),
  /** "Choose Vehicle", "Custom Services", "Date & Time". */
  bookingTitle: v(fontFamily.semiBold, 17, 22),
  /** Service rows ("Headlight Issue"), centre names, option-card titles. */
  rowTitle: v(fontFamily.semiBold, 15, 20),
  /** Vehicle numbers, row / option-card subtitles. */
  rowSubtitle: v(fontFamily.regular, 13, 17),
  /** Centre addresses, example prompts, the 0/500 counter. */
  meta: v(fontFamily.regular, 12, 16),
  /** Centre badges ("Authorised", "4.6 (320)"). */
  badge: v(fontFamily.medium, 11, 14),
  /** Congratulations title. */
  successTitle: v(fontFamily.semiBold, 24, 30),
} as const;

export type TypographyVariant = keyof typeof variants;

export const typography = { fontFamily, variants } as const;
export type Typography = typeof typography;
