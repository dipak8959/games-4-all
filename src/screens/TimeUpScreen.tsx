import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BigButton } from '../components/BigButton';
import { Icon } from '../components/Icon';
import { Rule } from '../components/Rule';
import { Screen } from '../components/Screen';
import { MINUTE_MS } from '../safety/screenTime';
import { gutter, palette, space } from '../theme/tokens';
import { type } from '../theme/type';

/**
 * Shown when a screen-time limit is reached.
 *
 * The tone matters: this is a friendly stop, not a punishment or a paywall.
 * There is no "watch an ad for five more minutes" and no way for the child to
 * dismiss it. A break ends on its own once it has lasted (`BREAK_MS`), and
 * says how long that is; otherwise only a grown-up can change the limit,
 * from Parent Zone.
 */
export function TimeUpScreen({
  kind,
  breakEndsAt,
  onOpenParentZone,
}: {
  readonly kind: 'session-over' | 'daily-over';
  /** When the break will have lasted long enough (epoch ms), for a break. */
  readonly breakEndsAt?: number | null;
  readonly onOpenParentZone: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (kind !== 'session-over' || breakEndsAt == null) return undefined;
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, [kind, breakEndsAt]);
  const minutes = breakEndsAt == null ? null : Math.max(1, Math.ceil((breakEndsAt - now) / MINUTE_MS));
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
        {kind === 'session-over' && minutes != null ? (
          <Text style={type.monoStrong} accessibilityLabel={`Back to play in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`}>
            {`BACK TO PLAY IN ${minutes} MIN`}
          </Text>
        ) : null}
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
