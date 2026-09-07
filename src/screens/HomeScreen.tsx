import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type DimensionValue } from 'react-native';

import { GradientSurface } from '../components/GradientSurface';
import { Screen } from '../components/Screen';
import { GAMES } from '../games/registry';
import { tap } from '../feedback/feedback';
import { ageGroupIcon, ageGroupLabel } from '../state/ageGroups';
import { useApp } from '../state/AppProvider';
import { progressFor, totalStars } from '../state/progress';
import {
  font,
  gradientForColor,
  hitTarget,
  palette,
  radius,
  shadow,
  space,
} from '../theme/tokens';

/** Fixed, decorative-only positions for the floating sparkles behind the
 *  header. Fixed rather than random so the layout never jumps between
 *  renders. */
const SPARKLES: readonly { readonly emoji: string; readonly top: number; readonly left: DimensionValue }[] = [
  { emoji: '✨', top: 2, left: '78%' },
  { emoji: '🌟', top: 46, left: '90%' },
  { emoji: '🎈', top: 70, left: '8%' },
];

/**
 * The child's home.
 *
 * Each game is one large gradient card carrying an icon, a colour, and a
 * name. A pre-reader picks by icon and colour; nothing here requires reading.
 * There is no store, no "more games" link, no promotion of anything outside
 * this app.
 */
export function HomeScreen({
  onOpenGame,
  onOpenParentZone,
}: {
  readonly onOpenGame: (gameId: string) => void;
  readonly onOpenParentZone: () => void;
}) {
  const { progress, settings } = useApp();
  const stars = totalStars(progress);
  const ageGroup = settings.ageGroup;

  return (
    <Screen>
      <View style={styles.header}>
        {SPARKLES.map((s, i) => (
          <Text
            key={i}
            style={[styles.sparkle, { top: s.top, left: s.left }]}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            {s.emoji}
          </Text>
        ))}

        <View style={styles.headerText}>
          <Text style={styles.title} accessibilityRole="header">
            Games 4 All 👋
          </Text>
          <View style={styles.pillRow}>
            <View style={styles.starBadge} accessibilityLabel={`${stars} stars collected`}>
              <Text style={styles.starBadgeText}>⭐ {stars}</Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Age group: ${ageGroupLabel(ageGroup)}. Tap to change, grown-ups only.`}
              onPress={onOpenParentZone}
              hitSlop={6}
              style={({ pressed }) => [styles.ageBadge, pressed && styles.pressed]}
            >
              <Text style={styles.ageBadgeText}>
                {ageGroupIcon(ageGroup)} {ageGroupLabel(ageGroup)}
              </Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Parent zone, grown-ups only"
          onPress={onOpenParentZone}
          hitSlop={10}
          style={({ pressed }) => [styles.parentButton, pressed && styles.pressed]}
        >
          <Text style={styles.parentIcon}>⚙️</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {GAMES.map((game) => {
          const gp = progressFor(progress, game.id);
          const earnedPips = Math.min(3, Math.ceil(gp.stars / 5));

          return (
            <Pressable
              key={game.id}
              accessibilityRole="button"
              accessibilityLabel={`${game.title}. ${gp.stars} stars earned.`}
              onPress={() => {
                tap(settings);
                onOpenGame(game.id);
              }}
              style={({ pressed }) => [styles.cardOuter, pressed && styles.cardPressed]}
            >
              <GradientSurface colors={gradientForColor(game.color)} style={styles.card}>
                <View style={styles.cardIconWrap}>
                  <Text style={styles.cardIcon}>{game.icon}</Text>
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>{game.title}</Text>
                  <Text style={styles.cardStars} accessibilityElementsHidden importantForAccessibility="no">
                    {earnedPips > 0 ? '⭐'.repeat(earnedPips) : 'Tap to play 🚀'}
                  </Text>
                </View>
              </GradientSurface>
            </Pressable>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 100,
    marginBottom: space.xs,
  },
  sparkle: { position: 'absolute', fontSize: 22, opacity: 0.7 },
  headerText: { flex: 1, gap: space.xs },
  title: { fontSize: font.title, fontWeight: '800', color: palette.ink },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  starBadge: {
    alignSelf: 'flex-start',
    backgroundColor: palette.sunLight,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  ageBadge: {
    alignSelf: 'flex-start',
    backgroundColor: palette.surface,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: palette.border,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  ageBadgeText: { fontSize: font.body - 3, fontWeight: '800', color: palette.ink },
  starBadgeText: { fontSize: font.body - 3, fontWeight: '800', color: palette.ink },
  parentButton: {
    width: hitTarget,
    height: hitTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    borderWidth: 2,
    borderColor: palette.border,
    ...shadow,
  },
  parentIcon: { fontSize: 30 },
  pressed: { opacity: 0.6 },
  list: { gap: space.md, paddingBottom: space.xl },
  cardOuter: { borderRadius: radius.xl, ...shadow },
  cardPressed: { transform: [{ scale: 0.97 }], opacity: 0.94 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 136,
    padding: space.lg,
    borderRadius: radius.xl,
  },
  cardIconWrap: {
    width: 78,
    height: 78,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIcon: { fontSize: 46 },
  cardText: { flex: 1, gap: space.xs },
  cardTitle: { fontSize: font.title - 4, fontWeight: '800', color: '#FFFFFF' },
  cardStars: { fontSize: font.body - 2, fontWeight: '700', color: 'rgba(255,255,255,0.92)' },
});
