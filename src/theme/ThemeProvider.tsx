import React, { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import { colors as defaultColors, type AppColors } from './colors';
import { createTheme, type Theme } from './createTheme';

const ThemeContext = createContext<Theme | null>(null);

type ThemeProviderProps = PropsWithChildren<{
  /** Swap in a different colour scheme (e.g. a light theme) – no component changes needed. */
  colors?: AppColors;
}>;

export function ThemeProvider({ colors = defaultColors, children }: ThemeProviderProps) {
  const value = useMemo(() => createTheme(colors), [colors]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme() must be used inside <ThemeProvider>.');
  }
  return theme;
}
