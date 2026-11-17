import { DarkTheme, type Theme as NavigationTheme } from '@react-navigation/native';
import type { Theme } from './createTheme';

/**
 * React Navigation theme derived from the same semantic tokens, so navigator
 * backgrounds never flash white between screens.
 */
export function createNavigationTheme(theme: Theme): NavigationTheme {
  const { colors } = theme;
  return {
    ...DarkTheme,
    dark: colors.statusBar === 'light-content',
    colors: {
      ...DarkTheme.colors,
      primary: colors.primary.main,
      background: colors.background.gradientMid,
      card: colors.background.gradientMid,
      text: colors.text.primary,
      border: colors.surface.cardBorder,
      notification: colors.status.error,
    },
  };
}
