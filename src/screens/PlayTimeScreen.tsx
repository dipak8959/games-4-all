import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BigButton } from '../components/BigButton';
import { FactGrid, NumberedRow } from '../components/FactGrid';
import { PlayTimeMeter } from '../components/PlayTimeMeter';
import { Rule } from '../components/Rule';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { TabBar, type TabKey } from '../components/TabBar';
import { formatMinutes } from '../safety/screenTime';
import { useApp } from '../state/AppProvider';
import { gutter, space } from '../theme/tokens';
import { type } from '../theme/type';

/**
 * How much play time is left today — the `TIME` tab.
 *
 * This is the one destination in the tab bar that is *not* behind the
 * parent gate, deliberately: how long someone has been playing is their own
 * information, reading it changes nothing, and a child who can see the
 * number is better placed to stop on their own than one who is simply cut
 * off. Changing a limit still needs a grown-up, so the only control here
 * points at the gate.
 */
export function PlayTimeScreen({
  onClose,
  onOpenParentZone,
  onOpenProfiles,
}: {
  readonly onClose: () => void;
  readonly onOpenParentZone: () => void;
  readonly onOpenProfiles: () => void;
}) {
  const { usage, settings, activeProfile, verdict } = useApp();

  const remaining = verdict.kind === 'ok' ? verdict.remainingMs : 0;
  const onSelectTab = (key: TabKey) => {
    if (key === 'games') onClose();
    else if (key === 'parent') onOpenParentZone();
    else if (key === 'me') onOpenProfiles();
  };

  return (
    <Screen padded={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={type.mono}>{(activeProfile?.name ?? 'PLAYER').toUpperCase()} · TODAY</Text>
          <Text style={type.h3} accessibilityRole="header">
            PLAY TIME
          </Text>
        </View>
        <Rule weight="major" />

        <View style={styles.block}>
          <PlayTimeMeter playedMs={usage.playedTodayMs} limitMs={settings.dailyLimitMs} />
        </View>
        <Rule weight="major" />

        <FactGrid
          facts={[
            { value: formatMinutes(usage.playedTodayMs), label: 'PLAYED TODAY' },
            { value: formatMinutes(usage.sessionMs), label: 'THIS SITTING' },
            {
              value: remaining == null ? '—' : formatMinutes(remaining),
              label: remaining == null ? 'NO LIMIT' : 'LEFT TODAY',
            },
          ]}
        />
        <Rule weight="major" />

        <SectionHeader label="HOW THIS WORKS" />
        <NumberedRow index="01" copy="Time only counts while a game is open. Looking at this list is free." />
        <NumberedRow index="02" copy="The clock resets on its own at midnight. Nothing carries over." />
        <NumberedRow
          index="03"
          copy="Only a grown-up can change a limit — there is nothing to watch or buy for more time."
        />
        <Rule weight="major" />

        <View style={styles.actions}>
          <BigButton label="Back to games" icon="home" onPress={onClose} chevron />
          <BigButton
            label="Change the limit"
            icon="lock"
            tone="quiet"
            note="GROWN-UPS ONLY"
            onPress={onOpenParentZone}
            style={styles.gap}
          />
        </View>
      </ScrollView>

      <TabBar active="time" onSelect={onSelectTab} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: space.xl },
  header: { paddingHorizontal: gutter, paddingTop: space.md, paddingBottom: space.lg, gap: space.xs },
  block: { paddingHorizontal: gutter, paddingVertical: space.lg },
  actions: { paddingHorizontal: gutter, paddingTop: space.lg },
  gap: { marginTop: space.sm },
});
