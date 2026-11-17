/**
 * Raw colour palette.
 *
 * THIS IS THE ONLY FILE IN THE CODEBASE ALLOWED TO CONTAIN RAW COLOUR VALUES.
 * Components must never import from here directly – use semantic tokens from
 * `colors.ts` via `useTheme()` (or the `theme` export) instead.
 *
 * Values are measured from the Figma exports in /design (402 x 874 frames).
 */

function parseHex(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h
      .split('')
      .map(c => c + c)
      .join('');
  }
  if (h.length !== 6) {
    throw new Error(`expected #RGB or #RRGGBB, received "${hex}"`);
  }
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Linear mix of two colours: mix(a, b, 0.15) = 85% a + 15% b, returned as #RRGGBB. */
export function mix(a: string, b: string, t: number): string {
  const ca = parseHex(a);
  const cb = parseHex(b);
  return `#${ca
    .map((v, i) => Math.round(v + (cb[i] - v) * t))
    .map(v => v.toString(16).padStart(2, '0').toUpperCase())
    .join('')}`;
}

/**
 * Derive a translucent colour from a palette entry.
 * Accepts #RGB or #RRGGBB and returns an `rgba(r, g, b, a)` string.
 */
export function alpha(hex: string, opacity: number): string {
  const [r, g, b] = parseHex(hex);
  const a = Math.min(1, Math.max(0, opacity));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

const brandViolet = '#6C47FF';
const white = '#FFFFFF';

export const palette = {
  // Background gradient (top-left highlight -> diagonal mid -> bottom).
  indigo700: '#352C92',
  indigo900: '#1D2061',
  indigo950: '#1B1F5E',

  // Brand violet: primary buttons, links, focus. Change this one value to re-brand.
  violet500: brandViolet,
  /** Button gradient end. Figma #8262FF = violet500 mixed 15% with white. */
  violet400: mix(brandViolet, white, 0.15),
  /** Background glows (kept separate so the backdrop doesn't change with the brand colour). */
  violetGlow: '#6C47FF',

  // Accents & neutrals.
  lime400: '#C8F135',
  mist100: '#E8E8F0',
  slate400: '#9B9BB0',
  navy600: '#2F4A75',
  navy500: '#344C72',

  white,
  black: '#000000',
  red400: '#FF6B6B',
} as const;

export type PaletteColor = (typeof palette)[keyof typeof palette];
