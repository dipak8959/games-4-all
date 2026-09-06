import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../components/Screen';
import { GAMES } from '../games/registry';
import { tap } from '../feedback/feedback';
import { useApp } from '../state/AppProvider';
import { progressFor, totalStars } from '../state/progress';
import { font, hitTarget, palette, radius, shadow, space } from '../theme/tokens';

/**
 * The child's home.
 *
 * Each game is one large card carrying an icon, a colour, and a name. A
 * pre-reader picks by icon and colour; nothing here requires reading. There is
 * no store, no "more games" link, no promotion of anything outside this app.
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

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title} accessibilityRole="header">
            Games 4 All
          </Text>
          <Text style={styles.stars} accessibilityLabel={`${stars} stars collected`}>
            ⭐ {stars}
          </Text>
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
          return (
            <Pressable
              key={game.id}
              accessibilityRole="button"
              accessibilityLabel={`${game.title}. ${gp.stars} stars earned.`}
              onPress={() => {
                tap(settings);
                onOpenGame(game.id);
              }}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: game.color },
                pressed && styles.cardPressed,
              ]}
            >
              <Text style={styles.cardIcon}>{game.icon}</Text>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{game.title}</Text>
                <Text style={styles.cardStars}>{'⭐'.repeat(Math.min(3, Math.ceil(gp.stars / 5)))}</Text>
              </View>
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
    marginBottom: space.md,
  },
  headerText: { flex: 1 },
  title: { fontSize: font.title, fontWeight: '800', color: palette.ink },
  stars: { fontSize: font.body, color: palette.inkSoft, marginTop: 2 },
  parentButton: {
    width: hitTarget,
    height: hitTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    borderWidth: 2,
    borderColor: palette.border,
  },
  parentIcon: { fontSize: 30 },
  pressed: { opacity: 0.6 },
  list: { gap: space.md, paddingBottom: space.xl },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 132,
    padding: space.lg,
    borderRadius: radius.lg,
    ...shadow,
  },
  cardPressed: { transform: [{ scale: 0.97 }], opacity: 0.92 },
  cardIcon: { fontSize: 60 },
  cardText: { flex: 1 },
  cardTitle: { fontSize: font.title - 4, fontWeight: '800', color: '#FFFFFF' },
  cardStars: { fontSize: font.body, marginTop: space.xs },
});
