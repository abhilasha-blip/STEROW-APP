import type { AppColors } from './colors';
import { radius } from './radius';
import { spacing } from './spacing';
import { typography } from './typography';

/** A theme is any colour scheme plus the shared (colour-free) scales. */
export type Theme = {
  colors: AppColors;
  typography: typeof typography;
  spacing: typeof spacing;
  radius: typeof radius;
};

/** Build a full theme from a colour scheme (e.g. a future `lightColors`). */
export const createTheme = (schemeColors: AppColors): Theme => ({
  colors: schemeColors,
  typography,
  spacing,
  radius,
});
