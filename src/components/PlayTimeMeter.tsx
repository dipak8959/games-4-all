import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatMinutes } from '../safety/screenTime';
import { palette, rule, space } from '../theme/tokens';
import { type } from '../theme/type';

/**
 * The handoff's `TODAY'S PLAY TIME` meter: a 10px track with an ink fill,
 * two machine labels under it.
 *
 * With no limit set — the default — there is nothing to fill against, so it
 * reports the total played and says so plainly rather than drawing an empty
 * bar that implies a limit exists.
 */
export function PlayTimeMeter({
  playedMs,
  limitMs,
}: {
  readonly playedMs: number;
  readonly limitMs: number | null;
}) {
  const fraction = limitMs && limitMs > 0 ? Math.min(1, playedMs / limitMs) : null;

  return (
    <View style={styles.root}>
      {fraction != null ? (
        <View
          style={styles.track}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(fraction * 100) }}
        >
          <View style={[styles.fill, { width: `${fraction * 100}%` }]} />
        </View>
      ) : null}

      <View style={styles.labels}>
        <Text style={type.monoStrong}>{formatMinutes(playedMs).toUpperCase()} USED</Text>
        <Text style={type.mono}>{limitMs ? `LIMIT ${formatMinutes(limitMs)}` : 'NO LIMIT SET'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.sm },
  track: {
    height: 10,
    backgroundColor: palette.surface,
    borderWidth: rule.hair,
    borderColor: palette.border,
  },
  fill: { height: '100%', backgroundColor: palette.ink },
  labels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
