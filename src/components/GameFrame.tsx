import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from './Icon';
import { Rule } from './Rule';
import { Screen } from './Screen';
import { gutter, hitTarget, palette, rule, space } from '../theme/tokens';
import { type } from '../theme/type';

/**
 * Chrome shared by every game: a back control, a title, and a progress row.
 *
 * The back control is an arrow with a large hit area and no confirmation — a
 * child must always be able to leave a game immediately, without reading
 * anything or answering a dialog.
 */
export function GameFrame({
  title,
  icon,
  onExit,
  progress,
  children,
}: {
  readonly title: string;
  readonly icon: IconName;
  readonly onExit: () => void;
  /** 0-1, drives the progress bar. */
  readonly progress: number;
  readonly children: React.ReactNode;
}) {
  const clamped = Math.max(0, Math.min(1, progress));

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to games"
          onPress={onExit}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <Icon name="back" size={26} color={palette.ink} />
        </Pressable>

        <View style={styles.titleWrap}>
          <Icon name={icon} size={18} color={palette.ink} />
          <Text style={type.h5} numberOfLines={1}>
            {title}
          </Text>
        </View>

        <Text style={type.mono}>{Math.round(clamped * 100)}%</Text>
      </View>

      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      >
        <View style={[styles.fill, { width: `${clamped * 100}%` }]} />
      </View>
      <Rule weight="major" />

      <View style={styles.body}>{children}</View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingRight: gutter,
  },
  back: {
    width: hitTarget,
    height: hitTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: rule.hair,
    borderRightColor: palette.border,
  },
  pressed: { backgroundColor: 'rgba(32,30,29,0.10)' },
  titleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  track: { height: 10, backgroundColor: palette.surface, borderTopWidth: rule.hair, borderTopColor: palette.border },
  fill: { height: '100%', backgroundColor: palette.ink },
  body: { flex: 1, paddingHorizontal: gutter, paddingTop: space.md },
});
