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
const black = '#000000';

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
  /** Onboarding light content sheet (design/onboarding). */
  mist50: '#F4F4F8',
  mist100: '#E8E8F0',
  /** Round close / remove buttons on the light sheet. */
  mist200: '#DFDFE7',
  /**
   * Disabled primary button (design/onboarding step 2–4): Figma draws slate400 at 40% over mist50,
   * which flattens to #D0D0DB. Kept solid so the button looks the same on any surface.
   */
  mist300: mix('#9B9BB0', '#F4F4F8', 0.6),
  slate400: '#9B9BB0',
  navy600: '#2F4A75',
  navy500: '#344C72',
  /** Dark text on light surfaces (onboarding labels and input text). */
  ink900: '#0D0F2B',

  white,
  black,
  red400: '#FF6B6B',
  /**
   * Error text on light surfaces: red400 darkened 30% so it reaches WCAG AA (4.8:1 on mist50).
   * Not in Figma – red400 alone is only 2.5:1 there.
   */
  red600: mix('#FF6B6B', black, 0.3),
} as const;

export type PaletteColor = (typeof palette)[keyof typeof palette];
