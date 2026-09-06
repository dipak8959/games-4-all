import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BigButton } from '../components/BigButton';
import { GradientSurface } from '../components/GradientSurface';
import { Screen } from '../components/Screen';
import { font, gradients, palette, radius, shadowFloating, space } from '../theme/tokens';

/**
 * Shown when a screen-time limit is reached.
 *
 * The tone matters: this is a friendly stop, not a punishment or a paywall.
 * There is no "watch an ad for five more minutes" and no way for the child to
 * dismiss it — only a grown-up can change the limit, from Parent Zone.
 */
export function TimeUpScreen({
  kind,
  onOpenParentZone,
}: {
  readonly kind: 'session-over' | 'daily-over';
  readonly onOpenParentZone: () => void;
}) {
  const message =
    kind === 'session-over'
      ? 'Time for a break! Go stretch, and come back soon.'
      : "That's all the play time for today. See you tomorrow!";

  return (
    <Screen>
      <GradientSurface colors={gradients.bg} style={styles.root}>
        <Text
          style={styles.floatLeft}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          💤
        </Text>
        <Text
          style={styles.floatRight}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          ⭐
        </Text>

        <View style={styles.iconBadge}>
          <Text style={styles.icon}>🌙</Text>
        </View>

        <Text style={styles.title} accessibilityRole="header">
          All done for now
        </Text>
        <Text style={styles.body}>{message}</Text>

        <BigButton
          label="Grown-up settings"
          icon="⚙️"
          tone="quiet"
          onPress={onOpenParentZone}
          style={styles.button}
        />
      </GradientSurface>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadowFloating,
  },
  floatLeft: { position: 'absolute', top: '12%', left: '10%', fontSize: 34, opacity: 0.6 },
  floatRight: { position: 'absolute', bottom: '15%', right: '12%', fontSize: 30, opacity: 0.6 },
  iconBadge: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.md,
  },
  icon: { fontSize: 72 },
  title: { fontSize: font.title, fontWeight: '800', color: palette.ink, textAlign: 'center' },
  body: {
    fontSize: font.body,
    color: palette.inkSoft,
    textAlign: 'center',
    marginTop: space.sm,
    maxWidth: 340,
  },
  button: { marginTop: space.xl, alignSelf: 'stretch', maxWidth: 340 },
});
