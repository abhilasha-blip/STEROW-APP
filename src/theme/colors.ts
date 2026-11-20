import { alpha, palette } from './palette';

/**
 * Semantic colour tokens. The rest of the app uses ONLY these names.
 * Built exclusively from `palette` – never add raw colour values here.
 */
export const colors = {
  background: {
    gradientStart: palette.indigo700,
    gradientMid: palette.indigo900,
    gradientEnd: palette.indigo950,
    glow: palette.violetGlow,
  },
  primary: {
    main: palette.violet500,
    gradientEnd: palette.violet400,
    contrastText: palette.white,
  },
  text: {
    primary: palette.white,
    secondary: palette.mist100,
    placeholder: palette.slate400,
    link: palette.violet500,
    /** Labels, typed text and titles on the light onboarding sheet. */
    onLight: palette.ink900,
    /** Placeholders, "Or", hints and the "/4" step total. */
    onLightMuted: palette.slate400,
    /** The current step number ("1" in "1/4"). */
    stepCurrent: palette.lime400,
  },
  input: {
    background: alpha(palette.mist100, 0.08),
    border: alpha(palette.mist100, 0.16),
    borderFocused: alpha(palette.violet500, 0.9),
    caret: palette.mist100,
    /** TextField variant="light", DateField and UploadBox. */
    lightBackground: palette.mist100,
    lightBorder: alpha(palette.black, 0.04),
    lightBorderDashed: palette.slate400,
    lightIcon: palette.indigo950,
  },
  progress: {
    track: alpha(palette.white, 0.16),
    fill: palette.lime400,
  },
  avatar: {
    background: palette.mist100,
    border: alpha(palette.black, 0.04),
    selectedRing: palette.violet500,
    badge: palette.violet500,
    badgeIcon: palette.mist50,
    placeholder: alpha(palette.slate400, 0.5),
  },
  surface: {
    card: alpha(palette.mist100, 0.08),
    cardBorder: alpha(palette.mist100, 0.16),
    iconButton: palette.navy600,
    iconButtonBorder: palette.navy500,
    /** Toasts: the darkest backdrop tone so they read above the gradient. */
    toast: palette.indigo950,
    toastBorder: alpha(palette.mist100, 0.16),
    shadow: palette.black,
    /** Bottom sheets: same tone as toasts, over a dimmed scrim. */
    sheet: palette.indigo950,
    sheetBorder: alpha(palette.mist100, 0.16),
    scrim: alpha(palette.black, 0.6),
    divider: alpha(palette.mist100, 0.16),
    handle: alpha(palette.mist100, 0.3),
    /** Onboarding: the light content sheet and the light bottom sheet. */
    sheetLight: palette.mist50,
    /** Dimmed backdrop behind the light bottom sheet (Figma: black 30%). */
    scrimLight: alpha(palette.black, 0.3),
    /** Round close (X) / remove buttons on light surfaces. */
    iconButtonLight: palette.mist200,
    dividerLight: palette.mist100,
    /** Upload icon circle in the empty UploadBox. */
    iconCircleLight: alpha(palette.black, 0.04),
  },
  accent: {
    biometric: palette.lime400,
  },
  status: {
    error: palette.red400,
    /** Inline errors on light surfaces (AA contrast). */
    errorOnLight: palette.red600,
  },
  statusBar: 'light-content',
} as const;

/** Shape every colour scheme (e.g. a future light theme) must satisfy. */
type Widen<T> = T extends string ? string : { [K in keyof T]: Widen<T[K]> };
export type AppColors = Omit<Widen<typeof colors>, 'statusBar'> & {
  statusBar: 'light-content' | 'dark-content';
};

/** Dot-paths to every leaf colour token, e.g. 'text.secondary'. */
export type ColorToken = {
  [G in Exclude<keyof AppColors, 'statusBar'>]: `${G & string}.${keyof AppColors[G] & string}`;
}[Exclude<keyof AppColors, 'statusBar'>];

export function resolveColor(scheme: AppColors, token: ColorToken): string {
  const [group, key] = token.split('.') as [keyof AppColors, string];
  return (scheme[group] as Record<string, string>)[key];
}
