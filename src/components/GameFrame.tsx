import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GradientSurface } from './GradientSurface';
import { Screen } from './Screen';
import { font, gradients, hitTarget, palette, radius, shadow, space } from '../theme/tokens';

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
  readonly icon: string;
  readonly onExit: () => void;
  /** 0-1, drives the progress bar. */
  readonly progress: number;
  readonly children: React.ReactNode;
}) {
  const clamped = Math.max(0, Math.min(1, progress));

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to games"
          onPress={onExit}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          hitSlop={12}
        >
          <Text style={styles.backIcon}>←</Text>
        </Pressable>

        <View style={styles.titleBadge}>
          <Text style={styles.titleIcon}>{icon}</Text>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>

        {/* Balances the back control so the title stays centred. */}
        <View style={styles.back} />
      </View>

      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      >
        <GradientSurface colors={gradients.leaf} style={[styles.fill, { width: `${clamped * 100}%` }]} />
      </View>

      <View style={styles.body}>{children}</View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.sm,
  },
  back: {
    width: hitTarget,
    height: hitTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    ...shadow,
  },
  backIcon: { fontSize: 34, color: palette.ink, fontWeight: '700' },
  pressed: { opacity: 0.6, transform: [{ scale: 0.94 }] },
  titleBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    backgroundColor: palette.surface,
    borderRadius: radius.pill,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    marginHorizontal: space.sm,
    ...shadow,
  },
  titleIcon: { fontSize: font.label },
  title: { flexShrink: 1, fontSize: font.label - 2, fontWeight: '800', color: palette.ink },
  track: {
    height: 14,
    borderRadius: radius.pill,
    backgroundColor: palette.surfaceAlt,
    overflow: 'hidden',
    marginBottom: space.md,
  },
  fill: { height: '100%', borderRadius: radius.pill },
  body: { flex: 1 },
});
