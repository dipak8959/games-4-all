import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { BigButton } from '../components/BigButton';
import { Screen } from '../components/Screen';
import { GAMES } from '../games/registry';
import { formatMinutes, LIMIT_CHOICES_MIN, MINUTE_MS } from '../safety/screenTime';
import { useApp } from '../state/AppProvider';
import { progressFor } from '../state/progress';
import { font, hitTarget, palette, radius, shadow, space } from '../theme/tokens';

/**
 * Parent Zone.
 *
 * Reached only through the parent gate. Holds the screen-time limits, the
 * feedback and difficulty switches, a plain-language statement of what the app
 * does and does not do with data, and the delete-everything control.
 */
export function ParentZoneScreen({ onClose }: { readonly onClose: () => void }) {
  const { settings, progress, usage, updateSettings, resetEverything } = useApp();
  const [erased, setErased] = useState(false);

  const confirmErase = useCallback(() => {
    Alert.alert(
      'Delete all data?',
      'This removes play history and settings from this device. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void resetEverything().then(() => setErased(true));
          },
        },
      ],
    );
  }, [resetEverything]);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Parent Zone
        </Text>
        <BigButton label="Done" onPress={onClose} tone="quiet" style={styles.done} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Section title="Screen time">
          <Text style={styles.caption}>
            Played today: {formatMinutes(usage.playedTodayMs)}
          </Text>

          <LimitPicker
            label="Limit each sitting"
            valueMs={settings.sessionLimitMs}
            onChange={(ms) => updateSettings({ sessionLimitMs: ms })}
          />
          <LimitPicker
            label="Limit each day"
            valueMs={settings.dailyLimitMs}
            onChange={(ms) => updateSettings({ dailyLimitMs: ms })}
          />
        </Section>

        <Section title="Play">
          <Toggle
            label="Sound effects"
            value={settings.soundOn}
            onChange={(v) => updateSettings({ soundOn: v })}
          />
          <Toggle
            label="Vibration"
            value={settings.hapticsOn}
            onChange={(v) => updateSettings({ hapticsOn: v })}
          />
          <Toggle
            label="Reduce motion"
            value={settings.reduceMotion}
            onChange={(v) => updateSettings({ reduceMotion: v })}
          />

          <Text style={styles.rowLabel}>Starting difficulty</Text>
          <View style={styles.chips}>
            {([1, 2, 3] as const).map((level) => (
              <Chip
                key={level}
                label={['Easy', 'Medium', 'Harder'][level - 1]}
                selected={settings.difficulty === level}
                onPress={() => updateSettings({ difficulty: level })}
              />
            ))}
          </View>
        </Section>

        <Section title="What each game practises">
          {GAMES.map((game) => {
            const gp = progressFor(progress, game.id);
            return (
              <View key={game.id} style={styles.gameRow}>
                <Text style={styles.gameIcon}>{game.icon}</Text>
                <View style={styles.gameText}>
                  <Text style={styles.gameTitle}>{game.title}</Text>
                  <Text style={styles.caption}>
                    {game.skill} · ages {game.ages}
                  </Text>
                  <Text style={styles.caption}>
                    {gp.rounds} {gp.rounds === 1 ? 'round' : 'rounds'} played
                  </Text>
                </View>
              </View>
            );
          })}
        </Section>

        <Section title="Privacy">
          <Text style={styles.privacy}>
            This app works entirely offline. It has no ads, no in-app purchases, no accounts,
            no analytics, and no third-party trackers. It does not ask for any device
            permission. Play history and settings are stored only on this device and are
            never sent anywhere.
          </Text>

          <BigButton
            label={erased ? 'Data deleted' : 'Delete all data'}
            icon={erased ? '✅' : '🗑️'}
            color={palette.berry}
            onPress={confirmErase}
            disabled={erased}
            style={styles.erase}
          />
        </Section>
      </ScrollView>
    </Screen>
  );
}

function Section({ title, children }: { readonly title: string; readonly children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  readonly label: string;
  readonly value: boolean;
  readonly onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ true: palette.leaf, false: palette.border }}
      />
    </View>
  );
}

function LimitPicker({
  label,
  valueMs,
  onChange,
}: {
  readonly label: string;
  readonly valueMs: number | null;
  readonly onChange: (ms: number | null) => void;
}) {
  return (
    <View style={styles.limit}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.chips}>
        {LIMIT_CHOICES_MIN.map((minutes) => {
          const ms = minutes == null ? null : minutes * MINUTE_MS;
          return (
            <Chip
              key={String(minutes)}
              label={minutes == null ? 'No limit' : `${minutes}m`}
              selected={valueMs === ms}
              onPress={() => onChange(ms)}
            />
          );
        })}
      </View>
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  readonly label: string;
  readonly selected: boolean;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.md,
  },
  title: { fontSize: font.title, fontWeight: '800', color: palette.ink },
  done: { paddingHorizontal: space.lg },
  body: { paddingBottom: space.xxl, gap: space.md },
  section: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: space.md,
    gap: space.sm,
    ...shadow,
  },
  sectionTitle: { fontSize: font.label, fontWeight: '800', color: palette.ink },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
  },
  rowLabel: { fontSize: font.body, color: palette.ink, fontWeight: '600', flexShrink: 1 },
  caption: { fontSize: font.body - 3, color: palette.inkSoft },
  limit: { gap: space.xs, paddingVertical: space.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingTop: space.xs },
  chip: {
    minHeight: 52,
    minWidth: 68,
    paddingHorizontal: space.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: palette.border,
    backgroundColor: palette.surfaceAlt,
  },
  chipSelected: { backgroundColor: palette.sky, borderColor: palette.sky },
  chipText: { fontSize: font.body - 2, fontWeight: '700', color: palette.ink },
  chipTextSelected: { color: '#FFFFFF' },
  gameRow: { flexDirection: 'row', gap: space.md, alignItems: 'center', minHeight: hitTarget },
  gameIcon: { fontSize: 38 },
  gameText: { flex: 1, gap: 2 },
  gameTitle: { fontSize: font.body, fontWeight: '700', color: palette.ink },
  privacy: { fontSize: font.body - 3, color: palette.inkSoft, lineHeight: 24 },
  erase: { marginTop: space.sm },
});
