import { colors } from './colors';
import { createTheme } from './createTheme';

/** The default (dark) app theme. */
export const theme = createTheme(colors);

export type { Theme } from './createTheme';
export type { AppColors, ColorToken } from './colors';
export type { TypographyVariant } from './typography';
export { createTheme } from './createTheme';
export { colors, resolveColor } from './colors';
export { typography } from './typography';
export { spacing, sizes } from './spacing';
export { radius } from './radius';
export { ThemeProvider, useTheme, useThemedStyles } from './ThemeProvider';
export { createNavigationTheme } from './navigationTheme';
