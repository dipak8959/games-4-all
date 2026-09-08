/**
 * Design tokens.
 *
 * Three constraints drive these values:
 *   - Hands are small and imprecise. Nothing tappable is below `hitTarget`,
 *     which is well above the 44/48dp platform minimums.
 *   - Colour is never the only signal. Every palette entry that identifies a
 *     game object is paired with a distinct shape or glyph, so the app works
 *     for colour-blind players.
 *   - Playful, not flat. Cards use two-stop gradients and a soft "candy"
 *     shadow rather than solid fills, which is what reads as a modern,
 *     made-for-kids app rather than a form.
 */

export const palette = {
  // Warm, low-glare background rather than pure white.
  bg: '#FFF6E9',
  bgAlt: '#FFEFD6',
  surface: '#FFFFFF',
  surfaceAlt: '#F5EEDF',
  ink: '#2A2118',
  inkSoft: '#6B5C49',
  border: '#E9DCC3',

  // Okabe-Ito derived: distinguishable under all common colour-vision types.
  // Each has a paired "light" tint used as a gradient's second stop.
  berry: '#E8630A',
  berryLight: '#FF9457',
  sky: '#0091D6',
  skyLight: '#5CC7FF',
  leaf: '#00A97A',
  leafLight: '#5FE0AE',
  sun: '#F3A712',
  sunLight: '#FFD166',
  grape: '#D9739F',
  grapeLight: '#FFA9CE',
  deep: '#5B5A82',
  deepLight: '#8B89C4',
  teal: '#0E8C7F',
  tealLight: '#5FD1BF',

  success: '#1B7F5A',
  warn: '#B25A00',
} as const;

export type PaletteColor = (typeof palette)[keyof typeof palette];

/** Two-stop gradients keyed by the same names as the base palette colours,
 *  for use with expo-linear-gradient. Diagonal (top-left to bottom-right)
 *  everywhere, which is what `GradientCard` and `BigButton` assume. */
export const gradients = {
  berry: [palette.berryLight, palette.berry] as const,
  sky: [palette.skyLight, palette.sky] as const,
  leaf: [palette.leafLight, palette.leaf] as const,
  sun: [palette.sunLight, palette.sun] as const,
  grape: [palette.grapeLight, palette.grape] as const,
  deep: [palette.deepLight, palette.deep] as const,
  teal: [palette.tealLight, palette.teal] as const,
  // Warm page-background wash, used behind hero moments (round complete).
  bg: [palette.bg, palette.bgAlt] as const,
} as const;

export type GradientKey = keyof typeof gradients;

/** Looks up the gradient pair for one of the base palette hex values (e.g.
 *  `palette.sky`), for callers that only have the resolved colour on hand
 *  (game definitions, props passed down from the registry). Falls back to a
 *  flat "gradient" of the same colour twice for anything unrecognised, so a
 *  future colour never crashes — it just renders solid. */
export function gradientForColor(color: string): readonly [string, string] {
  const entry = (Object.entries(palette) as [string, string][]).find(([, v]) => v === color);
  const key = entry?.[0] as GradientKey | undefined;
  if (key && key in gradients) return gradients[key];
  return [color, color];
}

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

export const radius = { sm: 12, md: 20, lg: 28, xl: 36, pill: 999 } as const;

export const font = {
  // Large by default: early readers and pre-readers need generous type.
  body: 20,
  label: 24,
  title: 34,
  hero: 64,
} as const;

/** Minimum tappable edge, in dp. Above platform minimums on purpose. */
export const hitTarget = 72;

/** Soft, warm-toned shadow used on resting cards. */
export const shadow = {
  shadowColor: '#3A2C1A',
  shadowOpacity: 0.14,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 5 },
  elevation: 5,
} as const;

/** Deeper shadow for elements that should visually "float" above the page,
 *  e.g. the round-complete card and the parent gate modal. */
export const shadowFloating = {
  shadowColor: '#3A2C1A',
  shadowOpacity: 0.22,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 12 },
  elevation: 10,
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

/** Decorative-only emoji sprinkled behind headers/empty space. Never used to
 *  convey information, so they carry no accessibility label. */
export const decorativeEmoji = ['✨', '🌟', '🎈', '🎉', '🧸', '🌈'] as const;
