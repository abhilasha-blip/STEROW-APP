import { alpha, palette } from './palette';

/**
 * Semantic colour tokens. The rest of the app uses ONLY these names.
 * Built exclusively from `palette` – never add raw colour values here.
 */
export const colors = {
  background: {
    gradientStart: palette.indigo700,
    gradientMid: palette.indigo900,
    gradientEnd: palette.indigo800,
    glow: palette.violetGlow,
  },
  primary: {
    main: palette.violet500,
    gradientEnd: palette.violet400,
    contrastText: palette.white,
  },
  text: {
    primary: palette.white,
    secondary: alpha(palette.white, 0.85),
    placeholder: alpha(palette.white, 0.45),
    link: palette.violet300,
  },
  input: {
    background: alpha(palette.white, 0.1),
    border: alpha(palette.white, 0.14),
    borderFocused: alpha(palette.violet400, 0.9),
  },
  surface: {
    card: alpha(palette.white, 0.08),
    cardBorder: alpha(palette.white, 0.14),
    iconButton: alpha(palette.white, 0.14),
  },
  accent: {
    biometric: palette.lime400,
  },
  status: {
    error: palette.red400,
  },
  statusBar: 'light-content',
} as const;

/** Shape every colour scheme (e.g. a future light theme) must satisfy. */
type Widen<T> = T extends string ? string : { [K in keyof T]: Widen<T[K]> };
export type AppColors = Omit<Widen<typeof colors>, 'statusBar'> & {
  statusBar: 'light-content' | 'dark-content';
};
