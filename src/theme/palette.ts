/**
 * Raw colour palette.
 *
 * THIS IS THE ONLY FILE IN THE CODEBASE ALLOWED TO CONTAIN RAW COLOUR VALUES.
 * Components must never import from here directly – use semantic tokens from
 * `colors.ts` via `useTheme()` (or the `theme` export) instead.
 */
export const palette = {
  indigo900: '#1F1F5E',
  indigo800: '#232470',
  indigo700: '#302A8C',
  violet500: '#6C55F5',
  violet400: '#7C66FF',
  violet300: '#8B7BFF',
  violetGlow: '#5B4BE0',
  lime400: '#C8F04A',
  white: '#FFFFFF',
  black: '#000000',
  red400: '#FF6B6B',
} as const;

export type PaletteColor = (typeof palette)[keyof typeof palette];

/**
 * Derive a translucent colour from a palette entry.
 * Accepts #RGB or #RRGGBB and returns an `rgba(r, g, b, a)` string.
 */
export function alpha(hex: string, opacity: number): string {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h
      .split('')
      .map(c => c + c)
      .join('');
  }
  if (h.length !== 6) {
    throw new Error(`alpha(): expected #RGB or #RRGGBB, received "${hex}"`);
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = Math.min(1, Math.max(0, opacity));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
