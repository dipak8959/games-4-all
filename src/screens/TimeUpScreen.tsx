import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BigButton } from '../components/BigButton';
import { Screen } from '../components/Screen';
import { font, palette, radius, shadow, space } from '../theme/tokens';

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
      <View style={styles.root}>
        <Text style={styles.icon}>🌙</Text>
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
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    ...shadow,
  },
  icon: { fontSize: 90, marginBottom: space.md },
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
