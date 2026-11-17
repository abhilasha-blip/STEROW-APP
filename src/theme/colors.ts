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
  },
  input: {
    background: alpha(palette.mist100, 0.08),
    border: alpha(palette.mist100, 0.16),
    borderFocused: alpha(palette.violet500, 0.9),
    caret: palette.mist100,
  },
  surface: {
    card: alpha(palette.mist100, 0.08),
    cardBorder: alpha(palette.mist100, 0.16),
    iconButton: palette.navy600,
    iconButtonBorder: palette.navy500,
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

/** Dot-paths to every leaf colour token, e.g. 'text.secondary'. */
export type ColorToken = {
  [G in Exclude<keyof AppColors, 'statusBar'>]: `${G & string}.${keyof AppColors[G] & string}`;
}[Exclude<keyof AppColors, 'statusBar'>];

export function resolveColor(scheme: AppColors, token: ColorToken): string {
  const [group, key] = token.split('.') as [keyof AppColors, string];
  return (scheme[group] as Record<string, string>)[key];
}
