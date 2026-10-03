import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { MarkName } from './marks';

/**
 * The nine faces a Pattern Play tile can wear, drawn from plain views.
 *
 * These were emoji — a star, a blue circle, a red triangle and friends. They
 * were the last picture in any game's own chrome, and they fought everything
 * around them: full-colour, vendor-specific cartoons sitting on a flat
 * ink-and-accent interface where every other mark is geometry the app draws
 * itself.
 *
 * Drawn marks are also simply better for this game. They take the colour
 * they are given, so a lit tile can invert to the ground colour instead of
 * needing a special fill that a red emoji would not disappear against. They
 * render identically on every device. And they are told apart by *shape*
 * alone — filled against hollow, square against round, up against down —
 * which is exactly what a sequence-memory game needs and what SAFETY.md's
 * "colour is never the only signal" rule asks for.
 *
 * Which face a tile wears is in `marks.ts` — data, kept separate so the
 * tests can import it without tripping over JSX.
 */
export function PatternMark({
  name,
  size,
  color,
}: {
  readonly name: MarkName;
  readonly size: number;
  readonly color: string;
}) {
  const stroke = Math.max(2, Math.round(size * 0.14));
  const box = { width: size, height: size };

  switch (name) {
    case 'disc':
      return <View style={{ ...box, borderRadius: size, backgroundColor: color }} />;

    case 'ring':
      return (
        <View style={{ ...box, borderRadius: size, borderWidth: stroke, borderColor: color }} />
      );

    case 'square':
      return <View style={{ ...box, backgroundColor: color }} />;

    case 'frame':
      return <View style={{ ...box, borderWidth: stroke, borderColor: color }} />;

    case 'triangle':
      return (
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: size / 2,
            borderRightWidth: size / 2,
            borderBottomWidth: size,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: color,
          }}
        />
      );

    case 'triangleDown':
      return (
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: size / 2,
            borderRightWidth: size / 2,
            borderTopWidth: size,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderTopColor: color,
          }}
        />
      );

    case 'diamond':
      // A square turned 45°, sized so its diagonal matches the others' box
      // rather than its edge — otherwise it reads as the larger mark.
      return (
        <View
          style={{
            width: size * 0.72,
            height: size * 0.72,
            backgroundColor: color,
            transform: [{ rotate: '45deg' }],
          }}
        />
      );

    case 'cross':
      return (
        <View style={[styles.center, box]}>
          <View style={{ width: size, height: stroke, backgroundColor: color }} />
          <View style={{ position: 'absolute', width: stroke, height: size, backgroundColor: color }} />
        </View>
      );

    case 'bars':
      return (
        <View style={[styles.center, box, { gap: stroke }]}>
          <View style={{ width: size, height: stroke, backgroundColor: color }} />
          <View style={{ width: size, height: stroke, backgroundColor: color }} />
          <View style={{ width: size, height: stroke, backgroundColor: color }} />
        </View>
      );
  }
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
