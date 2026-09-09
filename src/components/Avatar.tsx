import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { monogramFor } from '../state/profiles';
import { palette, playColor } from '../theme/tokens';

/**
 * A profile, drawn as its initial on its own colour.
 *
 * A flat square now — no gradient, no rounding — but it keeps its colour
 * where the rest of the chrome went to ink. Whose profile this is has to be
 * legible to someone who can't read the name yet, and colour is the only
 * signal that works at that age. It is one of two places colour survives in
 * the interface; the other is inside the games themselves.
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
  return (
    <View style={[styles.tile, { width: size, height: size, backgroundColor: playColor(color) }]}>
      <Text style={[styles.letter, { fontSize: size * 0.44 }]} allowFontScaling={false}>
        {monogramFor(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center' },
  letter: { fontWeight: '800', color: palette.bg },
});
