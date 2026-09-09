import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BigButton } from '../components/BigButton';
import { Icon } from '../components/Icon';
import { Rule } from '../components/Rule';
import { Screen } from '../components/Screen';
import { gutter, palette, space } from '../theme/tokens';
import { type } from '../theme/type';

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
    <Screen padded={false}>
      <View style={styles.top}>
        <Text style={type.mono}>{kind === 'session-over' ? 'BREAK TIME' : 'DONE FOR TODAY'}</Text>
      </View>
      <Rule weight="major" />

      <View style={styles.body}>
        <View style={styles.mark} accessibilityElementsHidden importantForAccessibility="no">
          <Icon name="clock" size={72} color={palette.inkSoft} />
        </View>
        <Text style={type.h2} accessibilityRole="header">
          ALL DONE FOR NOW
        </Text>
        <Text style={[type.body, styles.copy]}>{message}</Text>
      </View>

      <Rule weight="major" />
      <View style={styles.footer}>
        <BigButton
          label="Grown-up settings"
          icon="lock"
          note="ONLY A GROWN-UP CAN CHANGE A LIMIT"
          chevron
          onPress={onOpenParentZone}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: gutter, paddingTop: space.md, paddingBottom: space.lg },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: gutter, gap: space.md },
  mark: { alignItems: 'flex-start' },
  copy: { color: palette.inkSoft, maxWidth: 340 },
  footer: { padding: gutter },
});
