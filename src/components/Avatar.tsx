import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { monogramFor } from '../state/profiles';
import { gradients, palette, radius, type GradientKey } from '../theme/tokens';
import { GradientSurface } from './GradientSurface';

/**
 * A profile, drawn as its initial on its own colour.
 *
 * Replaces the emoji faces this app used to identify profiles with. A
 * letter and a colour are enough to tell "mine" from "my brother's" at a
 * glance, cost nothing to ship, and — unlike emoji — render identically on
 * every device.
 */
export function Avatar({
  name,
  color,
  size = 40,
}: {
  readonly name: string;
  /** A key from `AVATAR_CHOICES`. Anything unrecognised (including an emoji
   *  stored by an older build) falls back to the first palette colour, so a
   *  profile is never left without a tile. */
  readonly color: string;
  readonly size?: number;
}) {
  const key: GradientKey = color in gradients ? (color as GradientKey) : 'sky';

  return (
    <View style={[styles.outer, { width: size, height: size }]}>
      <GradientSurface colors={gradients[key]} style={styles.fill}>
        <Text style={[styles.letter, { fontSize: size * 0.44 }]} allowFontScaling={false}>
          {monogramFor(name)}
        </Text>
      </GradientSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { borderRadius: radius.md, overflow: 'hidden' },
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  letter: { fontWeight: '800', color: palette.surface },
});
