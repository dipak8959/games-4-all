/**
 * Design tokens — Modernist.
 *
 * These are the values from the `Games Hub` design handoff, applied to the
 * app itself rather than kept as a separate mock. Four rules are
 * load-bearing and everything below follows from them:
 *
 *   - **Zero radius everywhere.** No rounded corners, no pills.
 *   - **Flat.** No gradients, no shadows, no glows. Structure comes from
 *     rules: 2px dividers between major sections, 1px between rows.
 *   - **Flush left.** Including button labels.
 *   - **Accent used sparingly** — the primary action, the active tab, a
 *     small piece of emphasis. Never decoration.
 *
 * Two constraints from this app's own safety model outrank the handoff
 * where they collide, and both push in the safer direction:
 *
 *   - Nothing tappable is below `hitTarget` (72dp), well above the
 *     handoff's 44-52px rows and both platform minimums. Small hands are
 *     imprecise.
 *   - Colour still identifies people and play objects. The chrome is ink on
 *     ground, as the handoff specifies, but a profile keeps its own colour
 *     and every game keeps its colour-blind-safe play palette — a child
 *     picks "the blue one" long before they can read "Champ", and Sort It
 *     Out literally sorts by colour.
 */

export const palette = {
  /** Ground: the page. */
  bg: '#f3f2f2',
  /** Surface: inputs, tracks, and the cells that sit on the ground. */
  surface: '#eae9e9',
  /** A surface one step further back — placeholder fills, quiet rows. */
  surfaceAlt: '#d7d3d3',
  bgAlt: '#eae9e9',
  ink: '#201e1d',
  /** Muted text: meta, mono labels, secondary copy. */
  inkSoft: '#605d5d',
  /** Every rule in the app. 2px for major divisions, 1px between rows. */
  border: 'rgba(32,30,29,0.4)',

  /** The accent, and its interaction ramp. */
  accent: '#ec3013',
  accentHover: '#dd2b0f',
  accentPressed: '#ae1800',
  /** Body-size red on a light ground — darker, so it stays legible small. */
  accentText: '#ae1800',
  /** Filled accent tint, for small tags. */
  accentTint: '#ffe0d9',
  accentTintText: '#7c1405',

  /** Okabe-Ito derived: distinguishable under all common colour-vision
   *  types. Used for play objects and profile colours — never for chrome. */
  berry: '#E8630A',
  sky: '#0091D6',
  leaf: '#00A97A',
  sun: '#F3A712',
  grape: '#D9739F',
  deep: '#5B5A82',
  teal: '#0E8C7F',

  success: '#1B7F5A',
  warn: '#ae1800',
} as const;

export type PaletteColor = (typeof palette)[keyof typeof palette];

/** The colours a profile can be, and the colours a game screen draws its
 *  own objects in. Chrome never reaches into this. */
export const playPalette = {
  berry: palette.berry,
  sky: palette.sky,
  leaf: palette.leaf,
  sun: palette.sun,
  grape: palette.grape,
  deep: palette.deep,
  teal: palette.teal,
} as const;

export type PlayColorKey = keyof typeof playPalette;

/** Resolves one of `playPalette`'s keys, falling back to the first colour so
 *  an unrecognised value (a colour stored by an older build, say) never
 *  leaves a surface unfilled. */
export function playColor(key: string): string {
  return key in playPalette ? playPalette[key as PlayColorKey] : playPalette.sky;
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** The screen gutter. Everything flush to it, left and right. */
export const gutter = 16;

/**
 * Zero, everywhere, deliberately — kept as a named token so the rule is
 * visible at the call sites that used to round something off.
 */
export const radius = 0;

/** Rule weights: 2px divides sections, 1px divides rows within one. */
export const rule = { major: 2, hair: 1 } as const;

export const font = {
  // The handoff's scale, used as drawn.
  //
  // Every one of these is a size the wireframe actually sets. It is a
  // small-type system on purpose: the design carries emphasis with weight
  // and rules rather than with size, so a row title is 13px extra-bold
  // rather than 18px medium. Read it in Archivo, which is what these sizes
  // were drawn for — its x-height runs noticeably taller than a system
  // grotesque, so the same number is a visibly larger letter.
  display: 42,
  h2: 32,
  h3: 25,
  h5: 16,
  body: 15,
  secondary: 13,
  meta: 12,
  monoLg: 11,
  mono: 10,
  monoSm: 9,

  // Play surfaces keep generous type: a game's own numbers, letters and
  // answer buttons are read by a five-year-old at arm's length, which is a
  // different job from a section header, and the handoff has nothing to say
  // about what happens inside a game.
  play: 20,
  playLabel: 24,
  playTitle: 34,
  playHero: 64,
} as const;

/** Letter-spacing, in px (React Native has no `em`). Headings tighten,
 *  small uppercase labels open up. */
export const tracking = {
  heading: -0.5,
  label: 1,
  mono: 1,
} as const;

/** Minimum tappable edge, in dp. Above both platform minimums, and above
 *  the handoff's own 44-52px rows, on purpose. */
export const hitTarget = 72;

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
