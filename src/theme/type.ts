import { Platform, StyleSheet } from 'react-native';

import { font, palette, tracking } from './tokens';

/**
 * The two typefaces this app uses, and the styles built from them.
 *
 * The handoff asks for Archivo, bundled locally rather than fetched. This
 * app ships no asset files at all — no images, no icon font, nothing to
 * license or audit (see "Original content, always" in SAFETY.md) — so the
 * headings use the platform's own grotesque at the handoff's weights,
 * sizes, and letter-spacing instead. The shape of the type is the system's;
 * the scale and rhythm are the handoff's.
 *
 * Machine labels ("ON THIS DEVICE", "7 GAMES · OFFLINE") are set in the
 * platform monospace, which every device already has.
 */
export const monoFamily = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'ui-monospace, Menlo, monospace',
});

export const type = StyleSheet.create({
  /** Launcher-scale title. */
  display: {
    fontSize: font.display,
    fontWeight: '800',
    color: palette.ink,
    letterSpacing: tracking.heading,
    lineHeight: font.display * 1.12,
  },
  /** Screen title. */
  h2: {
    fontSize: font.h2,
    fontWeight: '800',
    color: palette.ink,
    letterSpacing: tracking.heading,
    lineHeight: font.h2 * 1.12,
  },
  /** Section title, hero title. */
  h3: {
    fontSize: font.h3,
    fontWeight: '800',
    color: palette.ink,
    letterSpacing: tracking.heading,
    lineHeight: font.h3 * 1.12,
  },
  /**
   * Row titles. Weight 600, not 800: the handoff puts 800 on headings and
   * section labels, and a screen where every line of text is at maximum
   * weight has no hierarchy left to spend — everything shouts and nothing
   * leads.
   */
  h5: {
    fontSize: font.h5,
    fontWeight: '600',
    color: palette.ink,
  },
  body: { fontSize: font.body, color: palette.ink, lineHeight: font.body * 1.55 },
  secondary: { fontSize: font.secondary, color: palette.ink, lineHeight: font.secondary * 1.45 },
  meta: { fontSize: font.meta, color: palette.inkSoft, lineHeight: font.meta * 1.4 },

  /** Machine label: uppercase, tracked out, muted. */
  mono: {
    fontFamily: monoFamily,
    fontSize: font.mono,
    letterSpacing: tracking.mono,
    color: palette.inkSoft,
    textTransform: 'uppercase',
  },
  monoSm: {
    fontFamily: monoFamily,
    fontSize: font.monoSm,
    letterSpacing: tracking.mono,
    color: palette.inkSoft,
    textTransform: 'uppercase',
  },
  /** Machine label carrying emphasis — a count, a percentage, a state. */
  monoStrong: {
    fontFamily: monoFamily,
    fontSize: 12,
    letterSpacing: tracking.mono,
    color: palette.ink,
    textTransform: 'uppercase',
  },
});
