import { colors } from './colors';
import { createTheme } from './createTheme';

/** The default (dark) app theme. */
export const theme = createTheme(colors);

export type { Theme } from './createTheme';
export type { AppColors } from './colors';
export { createTheme } from './createTheme';
export { colors } from './colors';
export { typography } from './typography';
export { spacing } from './spacing';
export { radius } from './radius';
export { ThemeProvider, useTheme } from './ThemeProvider';
export { createNavigationTheme } from './navigationTheme';
