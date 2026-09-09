import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Avatar } from '../components/Avatar';
import { GradientSurface } from '../components/GradientSurface';
import { Icon, type IconName } from '../components/Icon';
import { Screen } from '../components/Screen';
import {
  GAME_CATEGORIES,
  gamesByCategory,
  gamesForAge,
  searchGames,
  type GameCategory,
  type GameMeta,
} from '../games/catalog';
import { tap } from '../feedback/feedback';
import { DEFAULT_AGE } from '../state/profiles';
import { useApp } from '../state/AppProvider';
import { progressFor, totalStars } from '../state/progress';
import { togglePinned } from '../state/settings';
import {
  font,
  gradientForColor,
  hitTarget,
  palette,
  radius,
  shadow,
  space,
} from '../theme/tokens';

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
  const { progress, settings, activeProfile, updateSettings } = useApp();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<GameCategory | null>(null);
  const stars = totalStars(progress);
  const age = activeProfile?.age ?? DEFAULT_AGE;

  const games = useMemo(() => {
    const forAge = gamesForAge(age);
    const byCategory = gamesByCategory(forAge, category);
    return searchGames(byCategory, query);
  }, [age, category, query]);

  // Browsing (no active search or category filter) is when Favourites gets
  // its own shortcut row — the whole point of pinning is reaching a game
  // without going through search, so it would be self-defeating to only
  // show favourites once a search has already narrowed things down.
  const isBrowsing = query.trim() === '' && category === null;
  const pinnedIds = settings.pinnedGameIds;
  const favoriteGames = isBrowsing
    ? (pinnedIds.map((id) => games.find((g) => g.id === id)).filter(Boolean) as GameMeta[])
    : [];
  const favoriteIdSet = new Set(favoriteGames.map((g) => g.id));
  const listGames = isBrowsing ? games.filter((g) => !favoriteIdSet.has(g.id)) : games;

  const onTogglePin = (gameId: string) => updateSettings(togglePinned(settings, gameId));

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title} accessibilityRole="header">
            Games 4 All
          </Text>
          <View style={styles.pillRow}>
            <View style={styles.starBadge} accessibilityLabel={`${stars} stars collected`}>
              <Icon name="star" size={16} color={palette.ink} />
              <Text style={styles.starBadgeText}>{stars}</Text>
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
          <Avatar name={activeProfile?.name ?? 'Player'} color={activeProfile?.avatar ?? 'sky'} size={44} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Parent zone, grown-ups only"
          onPress={onOpenParentZone}
          hitSlop={10}
          style={({ pressed }) => [styles.parentButton, pressed && styles.pressed]}
        >
          <Icon name="settings" size={30} color={palette.ink} />
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <Icon name="search" size={20} color={palette.inkSoft} />
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
            <Icon name="close" size={16} color={palette.inkSoft} />
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
          icon="all"
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
            <Text style={styles.emptyText}>
              {query || category
                ? "No games match that search — try clearing it."
                : 'More games are on the way for this age.'}
            </Text>
          </View>
        ) : null}

        {favoriteGames.length > 0 ? (
          <>
            <Text style={styles.sectionHeading}>Your favourites</Text>
            {favoriteGames.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                stars={progressFor(progress, game.id).stars}
                pinned
                onPress={() => {
                  tap(settings);
                  onOpenGame(game.id);
                }}
                onTogglePin={() => onTogglePin(game.id)}
              />
            ))}
            <Text style={styles.sectionHeading}>All games</Text>
          </>
        ) : null}

        {listGames.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            stars={progressFor(progress, game.id).stars}
            pinned={pinnedIds.includes(game.id)}
            onPress={() => {
              tap(settings);
              onOpenGame(game.id);
            }}
            onTogglePin={() => onTogglePin(game.id)}
          />
        ))}
      </ScrollView>
    </Screen>
  );
}

function GameCard({
  game,
  stars,
  pinned,
  onPress,
  onTogglePin,
}: {
  readonly game: GameMeta;
  readonly stars: number;
  readonly pinned: boolean;
  readonly onPress: () => void;
  readonly onTogglePin: () => void;
}) {
  const earnedPips = Math.min(3, Math.ceil(stars / 5));

  return (
    <View style={styles.cardOuter}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${game.title}. ${stars} stars earned.`}
        onPress={onPress}
        style={({ pressed }) => [pressed && styles.cardPressed]}
      >
        <GradientSurface colors={gradientForColor(game.color)} style={styles.card}>
          <View style={styles.cardIconWrap}>
            <Icon name={game.icon} size={44} color="#FFFFFF" />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>{game.title}</Text>
            <Text style={styles.cardStars} accessibilityElementsHidden importantForAccessibility="no">
              {earnedPips > 0 ? '★'.repeat(earnedPips) : 'Tap to play'}
            </Text>
          </View>
        </GradientSurface>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${pinned ? 'Unpin' : 'Pin'} ${game.title}`}
        accessibilityState={{ selected: pinned }}
        onPress={onTogglePin}
        hitSlop={14}
        style={({ pressed }) => [styles.pinButton, pressed && styles.pinButtonPressed]}
      >
        <Icon name="star" size={22} color={pinned ? '#FFFFFF' : 'rgba(255,255,255,0.5)'} />
      </Pressable>
    </View>
  );
}

function CategoryChip({
  label,
  icon,
  selected,
  onPress,
}: {
  readonly label: string;
  readonly icon: IconName;
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
      <Icon name={icon} size={16} color={selected ? '#FFFFFF' : palette.ink} />
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
  headerText: { flex: 1, gap: space.xs },
  title: { fontSize: font.title, fontWeight: '800', color: palette.ink },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  starBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
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
  searchInput: { flex: 1, fontSize: font.body, color: palette.ink, paddingVertical: space.xs },
  clearButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
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
  categoryLabel: { fontSize: font.body - 4, fontWeight: '700', color: palette.ink },
  categoryLabelSelected: { color: '#FFFFFF' },
  list: { gap: space.md, paddingBottom: space.xl },
  empty: { alignItems: 'center', padding: space.xl, gap: space.sm },
  emptyText: { fontSize: font.body, color: palette.inkSoft, textAlign: 'center' },
  sectionHeading: {
    fontSize: font.body - 2,
    fontWeight: '800',
    color: palette.inkSoft,
    marginTop: space.xs,
  },
  cardOuter: { borderRadius: radius.xl, ...shadow },
  pinButton: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  pinButtonPressed: { transform: [{ scale: 0.9 }] },
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
  cardText: { flex: 1, gap: space.xs },
  cardTitle: { fontSize: font.title - 4, fontWeight: '800', color: '#FFFFFF' },
  cardStars: { fontSize: font.body - 2, fontWeight: '700', color: 'rgba(255,255,255,0.92)' },
});
