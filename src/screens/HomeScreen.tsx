import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon, type IconName } from '../components/Icon';
import { Rule } from '../components/Rule';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { TabBar, type TabKey } from '../components/TabBar';
import {
  GAME_CATEGORIES,
  gamesByCategory,
  gamesForAge,
  searchGames,
  type GameCategory,
  type GameMeta,
} from '../games/catalog';
import { MAX_LEVEL } from '../games/types';
import { tap } from '../feedback/feedback';
import { DEFAULT_AGE, type Profile } from '../state/profiles';
import { useApp } from '../state/AppProvider';
import { progressFor } from '../state/progress';
import { togglePinned } from '../state/settings';
import { font, gutter, hitTarget, palette, playColor, rule, space } from '../theme/tokens';
import { type } from '../theme/type';

/**
 * Home — the `Games Hub` handoff's first screen, built for real.
 *
 * The stack is the handoff's: a header over a 2px rule, the offline
 * reassurance row, search, who is playing, a hero, the on-device shelf,
 * favourites, and the tab bar. No cards, no shadows, no rounded corners;
 * every division is a rule.
 *
 * Two things are this app's rather than the handoff's. The handoff's
 * `WHO IS PLAYING` row picks an age band — this app has no bands, so the
 * row picks a *person* instead, and their real age filters the shelf
 * (`gamesForAge`). And where the handoff shows grayscale key art, this app
 * draws the game's own mark: it ships no image files at all, by design.
 */
export function HomeScreen({
  onOpenGame,
  onOpenParentZone,
  onOpenProfiles,
  onOpenPlayTime,
}: {
  readonly onOpenGame: (gameId: string) => void;
  readonly onOpenParentZone: () => void;
  readonly onOpenProfiles: () => void;
  readonly onOpenPlayTime: () => void;
}) {
  const { progress, settings, profiles, activeProfile, updateSettings, levelForGame } = useApp();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<GameCategory | null>(null);
  const age = activeProfile?.age ?? DEFAULT_AGE;

  const games = useMemo(() => {
    const forAge = gamesForAge(age);
    const byCategory = gamesByCategory(forAge, category);
    return searchGames(byCategory, query);
  }, [age, category, query]);

  // Browsing (no active search or category filter) is when the hero and the
  // favourites row earn their space — the whole point of pinning is reaching
  // a game without going through search, so it would be self-defeating to
  // only show favourites once a search has already narrowed things down.
  const isBrowsing = query.trim() === '' && category === null;
  const pinnedIds = settings.pinnedGameIds;
  const favourites = isBrowsing
    ? (pinnedIds.map((id) => games.find((g) => g.id === id)).filter(Boolean) as GameMeta[])
    : [];
  const hero = isBrowsing ? (favourites[0] ?? games[0] ?? null) : null;

  const onTogglePin = (gameId: string) => updateSettings(togglePinned(settings, gameId));
  const openGame = (gameId: string) => {
    tap(settings);
    onOpenGame(gameId);
  };

  const onSelectTab = (key: TabKey) => {
    if (key === 'parent') onOpenParentZone();
    else if (key === 'me') onOpenProfiles();
    else if (key === 'time') onOpenPlayTime();
  };

  return (
    <Screen padded={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={type.mono}>OFFLINE SUPER APP</Text>
            <Text style={type.h3} accessibilityRole="header">
              GAMES
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${activeProfile?.name ?? 'Profile'}, age ${age}. Tap to switch profile, grown-ups only.`}
            onPress={onOpenProfiles}
            style={({ pressed }) => [styles.kidChip, pressed && styles.pressedTint]}
          >
            <Icon name="shield" size={16} color={palette.ink} />
            <Text style={[type.monoSm, styles.kidChipText]}>
              {(activeProfile?.name ?? 'PLAYER').toUpperCase()}
            </Text>
          </Pressable>
        </View>
        <Rule weight="major" />

        <View style={styles.offlineRow}>
          <Icon name="offline" size={16} color={palette.accentText} />
          <Text style={type.secondary}>Works with no internet. No ads, no chat, no purchases.</Text>
        </View>
        <Rule weight="major" />

        <View style={styles.searchWrap}>
          <View style={styles.search}>
            <Icon name="search" size={18} color={palette.inkSoft} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={`Search ${games.length === 1 ? '1 game' : `${gamesForAge(age).length} games`} on this device`}
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
                hitSlop={16}
              >
                <Icon name="close" size={16} color={palette.inkSoft} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <SectionHeader label="WHO IS PLAYING" meta="TAP TO SWITCH" />
        <CellGrid
          columns={profiles.length > 3 ? 4 : Math.max(profiles.length, 1)}
          items={profiles}
          keyOf={(p) => p.id}
          render={(profile) => (
            <ProfileCell
              profile={profile}
              selected={profile.id === activeProfile?.id}
              onPress={onOpenProfiles}
            />
          )}
        />
        <Rule weight="major" />

        <SectionHeader label="WHAT KIND OF GAME" />
        <CellGrid
          columns={3}
          items={[{ id: null, label: 'All', icon: 'all' as IconName }, ...GAME_CATEGORIES]}
          keyOf={(c) => c.id ?? 'all'}
          render={(c) => (
            <CategoryCell
              label={c.label}
              icon={c.icon}
              selected={category === c.id}
              onPress={() => setCategory((prev) => (prev === c.id ? null : (c.id as GameCategory | null)))}
            />
          )}
        />
        <Rule weight="major" />

        {hero ? (
          <>
            <Hero
              game={hero}
              level={levelForGame(hero.id)}
              onPress={() => openGame(hero.id)}
            />
            <Rule weight="major" />
          </>
        ) : null}

        <SectionHeader
          label="ON THIS DEVICE"
          meta={`${games.length} ${games.length === 1 ? 'GAME' : 'GAMES'} · OFFLINE`}
        />

        {games.length === 0 ? (
          <View style={styles.empty}>
            <Text style={type.body}>
              {query || category
                ? 'No games match that search — try clearing it.'
                : 'More games are on the way for this age.'}
            </Text>
          </View>
        ) : (
          <CellGrid
            columns={3}
            items={games}
            keyOf={(g) => g.id}
            render={(game) => (
              <GameCell
                game={game}
                pinned={pinnedIds.includes(game.id)}
                stars={progressFor(progress, game.id).stars}
                onPress={() => openGame(game.id)}
                onTogglePin={() => onTogglePin(game.id)}
              />
            )}
          />
        )}

        {favourites.length > 0 ? (
          <>
            <Rule weight="major" />
            <SectionHeader label="PINNED BY THIS PROFILE" meta={`${favourites.length}`} />
            {favourites.map((game) => (
              <FavouriteRow key={game.id} game={game} onPress={() => openGame(game.id)} />
            ))}
          </>
        ) : null}
      </ScrollView>

      <TabBar active="games" onSelect={onSelectTab} />
    </Screen>
  );
}

/**
 * The handoff's grid: cells on the ground, separated by 1px divider-coloured
 * gaps. Rows are built explicitly rather than wrapped, so an incomplete last
 * row keeps its column width instead of stretching to fill — and so a
 * sub-pixel rounding difference can never drop a column onto its own line.
 */
function CellGrid<T>({
  columns,
  items,
  keyOf,
  render,
}: {
  readonly columns: number;
  readonly items: readonly T[];
  readonly keyOf: (item: T) => string;
  readonly render: (item: T) => React.ReactNode;
}) {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += columns) rows.push(items.slice(i, i + columns));

  return (
    <View style={styles.grid}>
      {rows.map((row, index) => (
        <View key={index} style={styles.gridRow}>
          {row.map((item) => (
            <View key={keyOf(item)} style={styles.gridCell}>
              {render(item)}
            </View>
          ))}
          {Array.from({ length: columns - row.length }, (_, i) => (
            <View key={`gap-${i}`} style={styles.gridCell} />
          ))}
        </View>
      ))}
    </View>
  );
}

function ProfileCell({
  profile,
  selected,
  onPress,
}: {
  readonly profile: Profile;
  readonly selected: boolean;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${profile.name}, age ${profile.age}${selected ? ', playing now' : ''}. Switching needs a grown-up.`}
      onPress={onPress}
      style={({ pressed }) => [styles.cell, selected && styles.cellSelected, pressed && !selected && styles.pressedTint]}
    >
      <View style={[styles.profileDot, { backgroundColor: selected ? palette.bg : playColor(profile.avatar) }]} />
      <Text style={[styles.cellLabel, selected && styles.onAccent]} numberOfLines={1}>
        {profile.name}
      </Text>
      <Text style={[type.monoSm, selected && styles.onAccentSub]}>{profile.age} YRS</Text>
    </Pressable>
  );
}

function CategoryCell({
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
      style={({ pressed }) => [styles.cell, selected && styles.cellSelected, pressed && !selected && styles.pressedTint]}
    >
      <Icon name={icon} size={20} color={selected ? palette.bg : palette.ink} />
      <Text style={[styles.cellLabel, selected && styles.onAccent]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * The handoff's 184px hero. Its key-art slot is a drawn mark rather than a
 * photograph: this repository ships no image files, so the game's own icon —
 * geometry the app draws at runtime — is the art.
 */
function Hero({
  game,
  level,
  onPress,
}: {
  readonly game: GameMeta;
  readonly level: number;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${game.title}. ${game.skill}. Ages ${game.ages}. Level ${level} of ${MAX_LEVEL}.`}
      onPress={onPress}
      style={({ pressed }) => [styles.hero, pressed && styles.heroPressed]}
    >
      <View style={styles.heroArt}>
        <Icon name={game.icon} size={96} color={palette.inkSoft} />
      </View>
      <View style={styles.heroPlate}>
        <Text style={[type.mono, styles.heroKicker]}>ON DEVICE · READY TO PLAY</Text>
        <Text style={type.h3}>{game.title}</Text>
        <Text style={type.meta}>
          Ages {game.ages} · {game.skill} · level {level} of {MAX_LEVEL}
        </Text>
      </View>
    </Pressable>
  );
}

function GameCell({
  game,
  pinned,
  stars,
  onPress,
  onTogglePin,
}: {
  readonly game: GameMeta;
  readonly pinned: boolean;
  readonly stars: number;
  readonly onPress: () => void;
  readonly onTogglePin: () => void;
}) {
  return (
    <View style={styles.gameCell}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${game.title}. ${stars} stars earned.`}
        onPress={onPress}
        style={({ pressed }) => [styles.gameCellMain, pressed && styles.pressedTint]}
      >
        <View style={styles.thumb}>
          <Icon name={game.icon} size={40} color={palette.ink} />
        </View>
        <Text style={styles.gameTitle} numberOfLines={2}>
          {game.title}
        </Text>
        <Text style={type.monoSm}>
          {game.ages} · {game.category.toUpperCase()}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${pinned ? 'Unpin' : 'Pin'} ${game.title}`}
        accessibilityState={{ selected: pinned }}
        onPress={onTogglePin}
        hitSlop={16}
        style={styles.pin}
      >
        <Icon name="star" size={18} color={pinned ? palette.accent : palette.border} />
      </Pressable>
    </View>
  );
}

/** The handoff's `SAME SCREEN, TWO PLAYERS` row, carrying this app's
 *  pinned games instead — same shape: a mark, two lines, and one accent
 *  block that starts it. */
function FavouriteRow({ game, onPress }: { readonly game: GameMeta; readonly onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Play ${game.title}`}
      onPress={onPress}
      style={({ pressed }) => [styles.favRow, pressed && styles.pressedTint]}
    >
      <View style={styles.favMark}>
        <Icon name={game.icon} size={24} color={palette.ink} />
      </View>
      <View style={styles.favText}>
        <Text style={type.h5}>{game.title}</Text>
        <Text style={type.meta}>{game.skill}</Text>
      </View>
      <View style={styles.favStart}>
        <Text style={[type.monoSm, styles.onAccent]}>PLAY</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: space.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: gutter,
    paddingTop: space.md,
    paddingBottom: space.lg,
    gap: space.md,
  },
  headerText: { gap: space.xs },
  kidChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 48,
    paddingHorizontal: space.md,
    borderWidth: rule.major,
    borderColor: palette.ink,
  },
  kidChipText: { color: palette.ink, fontWeight: '700' },
  offlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: gutter,
    paddingVertical: 11,
  },
  searchWrap: { paddingHorizontal: gutter, paddingTop: space.lg, paddingBottom: space.xs },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: hitTarget,
    paddingHorizontal: space.md,
    backgroundColor: palette.surface,
    borderWidth: rule.hair,
    borderColor: palette.border,
  },
  searchInput: { flex: 1, fontSize: font.body, color: palette.ink, paddingVertical: space.sm },

  grid: { gap: rule.hair, paddingHorizontal: gutter },
  gridRow: { flexDirection: 'row', gap: rule.hair },
  gridCell: { flex: 1 },

  cell: {
    minHeight: hitTarget,
    justifyContent: 'center',
    gap: space.xs,
    paddingVertical: space.md,
    paddingHorizontal: space.sm,
    backgroundColor: palette.surface,
    borderWidth: rule.hair,
    borderColor: palette.border,
  },
  cellSelected: { backgroundColor: palette.accent, borderColor: palette.accent },
  cellLabel: { fontSize: font.body, fontWeight: '600', color: palette.ink },
  onAccent: { color: palette.bg },
  onAccentSub: { color: palette.accentTint },
  profileDot: { width: 14, height: 14 },
  pressedTint: { backgroundColor: 'rgba(32,30,29,0.10)' },

  hero: {
    height: 184,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    backgroundColor: palette.surfaceAlt,
  },
  heroPressed: { opacity: 0.85 },
  heroArt: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingTop: space.lg,
    paddingRight: space.xl,
  },
  heroPlate: {
    maxWidth: 310,
    alignSelf: 'flex-start',
    backgroundColor: palette.bg,
    paddingLeft: gutter,
    paddingRight: gutter,
    paddingTop: space.md,
    paddingBottom: space.sm,
    gap: 2,
  },
  heroKicker: { color: palette.accentText },

  gameCell: { backgroundColor: palette.surface, borderWidth: rule.hair, borderColor: palette.border },
  gameCellMain: { padding: space.sm, gap: space.sm, minHeight: 150 },
  thumb: {
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surfaceAlt,
  },
  gameTitle: {
    fontSize: font.h5,
    fontWeight: '600',
    color: palette.ink,
    // Two lines' worth of height whether the title needs one line or two,
    // so a long name ("Number Crunch") and a short one ("Sudoku") leave
    // their cells the same height and the grid rows stay aligned.
    lineHeight: 21,
    minHeight: 42,
  },
  pin: { position: 'absolute', top: space.xs, right: space.xs, padding: space.xs },

  favRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: hitTarget,
    paddingHorizontal: gutter,
    paddingVertical: space.md,
    borderTopWidth: rule.hair,
    borderTopColor: palette.border,
  },
  favMark: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
  },
  favText: { flex: 1, gap: 2 },
  favStart: { backgroundColor: palette.accent, paddingHorizontal: space.lg, paddingVertical: space.md },

  empty: { paddingHorizontal: gutter, paddingVertical: space.xl },
});
