/**
 * Design tokens.
 *
 * Two constraints drive these values:
 *   - Hands are small and imprecise. Nothing tappable is below `hitTarget`,
 *     which is well above the 44/48dp platform minimums.
 *   - Colour is never the only signal. Every palette entry that identifies a
 *     game object is paired with a distinct shape or glyph, so the app works
 *     for colour-blind players.
 */

export const palette = {
  // Warm, low-glare background rather than pure white.
  bg: '#FFF7E8',
  surface: '#FFFFFF',
  surfaceAlt: '#F3ECDD',
  ink: '#2A2118',
  inkSoft: '#6B5C49',
  border: '#E2D5BE',

  // Okabe-Ito derived: distinguishable under all common colour-vision types.
  berry: '#D55E00',
  sky: '#0072B2',
  leaf: '#009E73',
  sun: '#E69F00',
  grape: '#CC79A7',
  deep: '#56556E',

  success: '#1B7F5A',
  warn: '#B25A00',
} as const;

export type PaletteColor = (typeof palette)[keyof typeof palette];

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

export const radius = { sm: 10, md: 18, lg: 28, pill: 999 } as const;

export const font = {
  // Large by default: early readers and pre-readers need generous type.
  body: 20,
  label: 24,
  title: 34,
  hero: 64,
} as const;

/** Minimum tappable edge, in dp. Above platform minimums on purpose. */
export const hitTarget = 72;

export const shadow = {
  shadowColor: '#3A2C1A',
  shadowOpacity: 0.16,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 4,
} as const;

/** Colours used to distinguish game objects, in a fixed order so a given
 *  index always maps to the same colour within a round. */
export const playColors = [
  palette.berry,
  palette.sky,
  palette.leaf,
  palette.sun,
  palette.grape,
  palette.deep,
] as const;
