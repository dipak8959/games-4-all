import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type DimensionValue } from 'react-native';

import { GradientSurface } from '../components/GradientSurface';
import { Screen } from '../components/Screen';
import { GAME_CATEGORIES, gamesByCategory, gamesForAge, searchGames, type GameCategory } from '../games/catalog';
import { tap } from '../feedback/feedback';
import { DEFAULT_AGE } from '../state/profiles';
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
  onOpenProfiles,
}: {
  readonly onOpenGame: (gameId: string) => void;
  readonly onOpenParentZone: () => void;
  readonly onOpenProfiles: () => void;
}) {
  const { progress, settings, activeProfile } = useApp();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<GameCategory | null>(null);
  const stars = totalStars(progress);
  const age = activeProfile?.age ?? DEFAULT_AGE;

  const games = useMemo(() => {
    const forAge = gamesForAge(age);
    const byCategory = gamesByCategory(forAge, category);
    return searchGames(byCategory, query);
  }, [age, category, query]);

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
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${activeProfile?.name ?? 'Profile'}, age ${age}. Tap to switch profile, grown-ups only.`}
          onPress={onOpenProfiles}
          hitSlop={6}
          style={({ pressed }) => [styles.profileButton, pressed && styles.pressed]}
        >
          <Text style={styles.profileAvatar}>{activeProfile?.avatar ?? '🧒'}</Text>
        </Pressable>

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

      <View style={styles.searchRow}>
        <Text style={styles.searchIcon} accessibilityElementsHidden importantForAccessibility="no">
          🔍
        </Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search games…"
          placeholderTextColor={palette.inkSoft}
          style={styles.searchInput}
          accessibilityLabel="Search games"
          returnKeyType="search"
          autoCorrect={false}
        />
        {query.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            onPress={() => setQuery('')}
            hitSlop={8}
            style={styles.clearButton}
          >
            <Text style={styles.clearIcon}>✕</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
      >
        <CategoryChip
          label="All"
          icon="🎲"
          selected={category === null}
          onPress={() => setCategory(null)}
        />
        {GAME_CATEGORIES.map((c) => (
          <CategoryChip
            key={c.id}
            label={c.label}
            icon={c.icon}
            selected={category === c.id}
            onPress={() => setCategory((prev) => (prev === c.id ? null : c.id))}
          />
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {games.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon} accessibilityElementsHidden importantForAccessibility="no">
              🌱
            </Text>
            <Text style={styles.emptyText}>
              {query || category
                ? "No games match that search — try clearing it."
                : 'More games are on the way for this age.'}
            </Text>
          </View>
        ) : null}
        {games.map((game) => {
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

function CategoryChip({
  label,
  icon,
  selected,
  onPress,
}: {
  readonly label: string;
  readonly icon: string;
  readonly selected: boolean;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label} games${selected ? ', selected' : ''}`}
      onPress={onPress}
      style={[styles.categoryChip, selected && styles.categoryChipSelected]}
    >
      <Text style={styles.categoryIcon}>{icon}</Text>
      <Text style={[styles.categoryLabel, selected && styles.categoryLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 100,
    marginBottom: space.xs,
    gap: space.xs,
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
  starBadgeText: { fontSize: font.body - 3, fontWeight: '800', color: palette.ink },
  profileButton: {
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
  profileAvatar: { fontSize: 34 },
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: palette.surface,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: palette.border,
    paddingHorizontal: space.md,
    minHeight: 52,
    marginBottom: space.sm,
  },
  searchIcon: { fontSize: 20 },
  searchInput: { flex: 1, fontSize: font.body, color: palette.ink, paddingVertical: space.xs },
  clearButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  clearIcon: { fontSize: 18, color: palette.inkSoft, fontWeight: '800' },
  categoryRow: { gap: space.sm, paddingBottom: space.sm },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    minHeight: 44,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: palette.border,
    backgroundColor: palette.surfaceAlt,
  },
  categoryChipSelected: { backgroundColor: palette.sky, borderColor: palette.sky },
  categoryIcon: { fontSize: 16 },
  categoryLabel: { fontSize: font.body - 4, fontWeight: '700', color: palette.ink },
  categoryLabelSelected: { color: '#FFFFFF' },
  list: { gap: space.md, paddingBottom: space.xl },
  empty: { alignItems: 'center', padding: space.xl, gap: space.sm },
  emptyIcon: { fontSize: 60 },
  emptyText: { fontSize: font.body, color: palette.inkSoft, textAlign: 'center' },
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
