import { Platform, StyleSheet } from 'react-native';

import { font, palette, tracking } from './tokens';

/**
 * The typefaces this app sets, and the styles built from them.
 *
 * **Archivo, bundled.** The handoff asks for Archivo 400/800, bundled
 * locally rather than fetched, and that is now literally what ships:
 * `assets/fonts/Archivo-Regular.ttf` and `Archivo-ExtraBold.ttf`, loaded at
 * startup by `App.tsx`. Substituting the platform grotesque was a mistake —
 * Archivo has a taller x-height and a much heavier extra-bold than any
 * system stack, so the same nominal sizes rendered smaller and the weights
 * rendered wrong, which is exactly what the design looked like it had lost.
 *
 * **Two weights, not five.** The design system uses 400 and 800 and nothing
 * in between (every one of the wireframe's weight declarations is 800; the
 * rest inherits 400). So weight here is carried by *which face is set*,
 * never by `fontWeight` — a custom family on Android does not switch faces
 * on weight at all, and on web asking for 800 from a face that is already
 * extra-bold makes the browser synthesise a second bolding on top. Set
 * `fonts.heavy` and leave `fontWeight` alone.
 *
 * Machine labels are the one exception: they are set in the platform
 * monospace, which every device already has.
 */
export const fonts = {
  /** Archivo 400 — body, secondary, meta. */
  regular: 'Archivo',
  /** Archivo 800 — every heading, label, and row title in the design. */
  heavy: 'ArchivoExtraBold',
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'ui-monospace, Menlo, monospace',
  }),
} as const;

/** Kept as its own export because a few call sites style mono text inline. */
export const monoFamily = fonts.mono;

export const type = StyleSheet.create({
  /** Launcher-scale title. */
  display: {
    fontFamily: fonts.heavy,
    fontSize: font.display,
    color: palette.ink,
    letterSpacing: tracking.heading,
    lineHeight: font.display * 1.12,
  },
  /** Detail title. */
  h2: {
    fontFamily: fonts.heavy,
    fontSize: font.h2,
    color: palette.ink,
    letterSpacing: tracking.heading,
    lineHeight: font.h2 * 1.12,
  },
  /** Screen title, hero title. */
  h3: {
    fontFamily: fonts.heavy,
    fontSize: font.h3,
    color: palette.ink,
    letterSpacing: tracking.heading,
    lineHeight: font.h3 * 1.12,
  },
  /** Section header: 16px, uppercase, opened out. */
  h5: {
    fontFamily: fonts.heavy,
    fontSize: font.h5,
    color: palette.ink,
    letterSpacing: tracking.label,
  },
  /**
   * A row title — a game's name on its tile, a setting's name, the label on
   * a button. 13px extra-bold: small and heavy is the design's register for
   * these, not large and medium.
   */
  rowTitle: {
    fontFamily: fonts.heavy,
    fontSize: font.secondary,
    color: palette.ink,
    lineHeight: font.secondary * 1.25,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: font.body,
    color: palette.ink,
    lineHeight: font.body * 1.55,
  },
  secondary: {
    fontFamily: fonts.regular,
    fontSize: font.secondary,
    color: palette.ink,
    lineHeight: font.secondary * 1.45,
  },
  meta: {
    fontFamily: fonts.regular,
    fontSize: font.meta,
    color: palette.inkSoft,
    lineHeight: font.meta * 1.4,
  },

  /** Machine label: uppercase, tracked out, muted. */
  mono: {
    fontFamily: fonts.mono,
    fontSize: font.mono,
    letterSpacing: tracking.mono,
    color: palette.inkSoft,
    textTransform: 'uppercase',
  },
  monoSm: {
    fontFamily: fonts.mono,
    fontSize: font.monoSm,
    letterSpacing: tracking.mono,
    color: palette.inkSoft,
    textTransform: 'uppercase',
  },
  /** Machine label carrying emphasis — a count, a percentage, a state. */
  monoStrong: {
    fontFamily: fonts.mono,
    fontSize: font.monoLg,
    letterSpacing: tracking.mono,
    color: palette.ink,
    textTransform: 'uppercase',
  },
});
