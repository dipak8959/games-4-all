import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from './Icon';
import { palette, rule, space } from '../theme/tokens';
import { type } from '../theme/type';

export type TabKey = 'games' | 'parent' | 'time' | 'me';

type Tab = {
  readonly key: TabKey;
  readonly label: string;
  readonly icon: IconName;
  /** Spoken instead of the visible label, which is a machine label. */
  readonly spoken: string;
};

/**
 * The four places this app goes.
 *
 * `PARENT` and `ME` are both behind the parent gate — switching who is
 * playing is as much a grown-up's decision as changing a limit is. `TIME`
 * is not: how much play time is left today is the child's own information,
 * and reading it changes nothing.
 */
const TABS: readonly Tab[] = [
  { key: 'games', label: 'GAMES', icon: 'all', spoken: 'Games' },
  { key: 'parent', label: 'PARENT', icon: 'shield', spoken: 'Parent zone, grown-ups only' },
  { key: 'time', label: 'TIME', icon: 'clock', spoken: "Today's play time" },
  { key: 'me', label: 'ME', icon: 'user', spoken: 'Profiles, grown-ups only' },
];

export function TabBar({
  active,
  onSelect,
}: {
  readonly active: TabKey;
  readonly onSelect: (tab: TabKey) => void;
}) {
  return (
    <View style={styles.bar}>
      {TABS.map((tab) => {
        const selected = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={tab.spoken}
            onPress={() => onSelect(tab.key)}
            style={({ pressed }) => [
              styles.tab,
              selected && styles.tabSelected,
              pressed && !selected && styles.tabPressed,
            ]}
          >
            <Icon name={tab.icon} size={20} color={selected ? palette.bg : palette.ink} />
            <Text style={[type.monoSm, styles.label, selected && styles.labelSelected]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: rule.major,
    borderTopColor: palette.ink,
    backgroundColor: palette.bg,
  },
  tab: {
    flex: 1,
    // The handoff's tab items are ~52px; the app's floor for anything
    // tappable is 72dp, so these are taller than drawn, never shorter.
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  tabSelected: { backgroundColor: palette.accent },
  tabPressed: { backgroundColor: 'rgba(32,30,29,0.10)' },
  label: { color: palette.ink },
  labelSelected: { color: palette.bg },
});
