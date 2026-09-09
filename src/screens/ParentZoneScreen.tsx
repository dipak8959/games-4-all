import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Avatar } from '../components/Avatar';
import { BigButton } from '../components/BigButton';
import { ConfirmModal } from '../components/ConfirmModal';
import { FactGrid, NumberedRow } from '../components/FactGrid';
import { Icon } from '../components/Icon';
import { PlayTimeMeter } from '../components/PlayTimeMeter';
import { Rule } from '../components/Rule';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { GAMES_META } from '../games/catalog';
import { MAX_LEVEL } from '../games/types';
import { LIMIT_CHOICES_MIN, MINUTE_MS } from '../safety/screenTime';
import { useApp } from '../state/AppProvider';
import { progressFor } from '../state/progress';
import { gutter, hitTarget, palette, rule, space } from '../theme/tokens';
import { type } from '../theme/type';

/**
 * Parent Zone.
 *
 * Reached only through the parent gate. Holds the screen-time limits, the
 * feedback and difficulty switches, a plain-language statement of what the
 * app does and does not do with data, and the delete-everything control.
 *
 * This is where the handoff's second screen ended up. Its job — "let a
 * parent approve a game in seconds" — is a parent's job, so the safety tag
 * row, the fact grid, the numbered "what parents should know" rows and the
 * play-time meter live here rather than on a detail screen between a child
 * and the game they just tapped.
 */
export function ParentZoneScreen({
  onClose,
  onOpenProfiles,
}: {
  readonly onClose: () => void;
  readonly onOpenProfiles: () => void;
}) {
  const { settings, progress, usage, activeProfile, updateSettings, resetEverything, levelForGame } = useApp();
  const [erased, setErased] = useState(false);
  const [confirmingErase, setConfirmingErase] = useState(false);

  const eraseNow = useCallback(() => {
    setConfirmingErase(false);
    void resetEverything().then(() => setErased(true));
  }, [resetEverything]);

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={type.mono}>GROWN-UPS ONLY</Text>
          <Text style={type.h3} accessibilityRole="header">
            PARENT ZONE
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Done"
          onPress={onClose}
          style={({ pressed }) => [styles.done, pressed && styles.pressedTint]}
        >
          <Text style={type.monoStrong}>DONE</Text>
        </Pressable>
      </View>
      <Rule weight="major" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.tags}>
          <Tag label={`AGE ${activeProfile?.age ?? '—'}`} filled />
          <Tag label="NO ADS" />
          <Tag label="NO CHAT" />
          <Tag label="NO PURCHASES" />
        </View>
        <Rule weight="major" />

        <FactGrid
          facts={[
            { value: `${GAMES_META.length}`, label: 'GAMES ON DEVICE' },
            { value: '0 KB', label: 'SENT ANYWHERE' },
            { value: '1', label: 'PLAYER AT A TIME' },
          ]}
        />
        <Rule weight="major" />

        <SectionHeader label="TODAY'S PLAY TIME" />
        <View style={styles.block}>
          <PlayTimeMeter playedMs={usage.playedTodayMs} limitMs={settings.dailyLimitMs} />
        </View>

        <LimitPicker
          label="LIMIT EACH SITTING"
          valueMs={settings.sessionLimitMs}
          onChange={(ms) => updateSettings({ sessionLimitMs: ms })}
        />
        <LimitPicker
          label="LIMIT EACH DAY"
          valueMs={settings.dailyLimitMs}
          onChange={(ms) => updateSettings({ dailyLimitMs: ms })}
        />
        <Rule weight="major" />

        <SectionHeader label="WHO IS PLAYING" />
        <View style={styles.profileRow}>
          {activeProfile ? (
            <>
              <Avatar name={activeProfile.name} color={activeProfile.avatar} size={40} />
              <View style={styles.profileText}>
                <Text style={type.rowTitle}>{activeProfile.name}</Text>
                <Text style={type.meta}>
                  Age {activeProfile.age} — decides which games show, and where each one starts
                </Text>
              </View>
            </>
          ) : (
            <Text style={type.body}>No profile</Text>
          )}
        </View>
        <View style={styles.block}>
          <BigButton label="Manage profiles" icon="user" tone="quiet" chevron onPress={onOpenProfiles} />
        </View>
        <Rule weight="major" />

        <SectionHeader label="PLAY" />
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
        <Rule weight="major" />

        <SectionHeader label="WHAT PARENTS SHOULD KNOW" />
        <NumberedRow
          index="01"
          copy="Runs fully offline. Release builds have no internet permission at all."
        />
        <NumberedRow
          index="02"
          copy="No strangers, no messaging, no leaderboards — stars and levels stay on this device."
        />
        <NumberedRow
          index="03"
          copy="No ads, no purchases, no accounts, no analytics. Nothing is collected to sell or lose."
        />
        <NumberedRow
          index="04"
          copy="Every game adjusts itself round to round. Nobody can lose, and nothing is timed."
        />
        <Rule weight="major" />

        <SectionHeader label="WHAT EACH GAME PRACTISES" meta={`${GAMES_META.length} TOTAL`} />
        {GAMES_META.map((game) => {
          const gp = progressFor(progress, game.id);
          return (
            <View key={game.id} style={styles.gameRow}>
              <View style={styles.gameMark}>
                <Icon name={game.icon} size={24} color={palette.ink} />
              </View>
              <View style={styles.gameText}>
                <Text style={type.rowTitle}>{game.title}</Text>
                <Text style={type.meta}>{game.skill}</Text>
                <Text style={type.monoSm}>
                  AGES {game.ages} · {gp.rounds} {gp.rounds === 1 ? 'ROUND' : 'ROUNDS'} · LEVEL{' '}
                  {levelForGame(game.id)}/{MAX_LEVEL}
                </Text>
              </View>
            </View>
          );
        })}
        <Rule weight="major" />

        <SectionHeader label="PRIVACY" />
        <View style={styles.block}>
          <Text style={type.secondary}>
            This app works entirely offline. It has no ads, no in-app purchases, no accounts, no
            analytics, and no third-party trackers. It does not ask for any device permission.
            Play history and settings are stored only on this device and are never sent anywhere.
          </Text>
          <BigButton
            label={erased ? 'Data deleted' : 'Delete all data'}
            icon={erased ? 'check' : 'trash'}
            note={erased ? undefined : 'EVERY PROFILE ON THIS DEVICE'}
            onPress={() => setConfirmingErase(true)}
            disabled={erased}
            style={styles.gap}
          />
        </View>
      </ScrollView>

      <ConfirmModal
        visible={confirmingErase}
        title="Delete all data?"
        body="This removes play history and settings from this device. It cannot be undone."
        confirmLabel="Delete"
        onConfirm={eraseNow}
        onCancel={() => setConfirmingErase(false)}
      />
    </Screen>
  );
}

/** A small safety claim, in the handoff's tag shape: filled tint for the
 *  age, 1px outline for the rest. */
function Tag({ label, filled = false }: { readonly label: string; readonly filled?: boolean }) {
  return (
    <View style={[styles.tag, filled ? styles.tagFilled : styles.tagOutlined]}>
      <Text style={[type.monoSm, filled ? styles.tagFilledText : undefined]}>{label}</Text>
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
      <Text style={type.rowTitle}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ true: palette.accent, false: palette.surfaceAlt }}
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
      <Text style={[type.mono, styles.limitLabel]}>{label}</Text>
      <View style={styles.chips}>
        {LIMIT_CHOICES_MIN.map((minutes) => {
          const ms = minutes == null ? null : minutes * MINUTE_MS;
          const selected = valueMs === ms;
          return (
            <Pressable
              key={String(minutes)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={minutes == null ? 'No limit' : `${minutes} minutes`}
              onPress={() => onChange(ms)}
              style={({ pressed }) => [
                styles.chip,
                selected && styles.chipSelected,
                pressed && !selected && styles.pressedTint,
              ]}
            >
              <Text style={[type.rowTitle, selected && styles.onAccent]}>
                {minutes == null ? 'None' : `${minutes}m`}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: gutter,
    paddingTop: space.md,
    paddingBottom: space.lg,
  },
  headerText: { gap: space.xs },
  done: {
    minHeight: hitTarget,
    paddingHorizontal: gutter,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: rule.hair,
    borderLeftColor: palette.border,
  },
  scroll: { paddingBottom: space.xl },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, padding: gutter },
  tag: { paddingHorizontal: space.sm, paddingVertical: 5 },
  tagFilled: { backgroundColor: palette.accentTint },
  tagFilledText: { color: palette.accentTintText },
  tagOutlined: { borderWidth: rule.hair, borderColor: palette.border },
  block: { paddingHorizontal: gutter, paddingBottom: space.lg, gap: space.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: hitTarget,
    paddingHorizontal: gutter,
    borderTopWidth: rule.hair,
    borderTopColor: palette.border,
  },
  limit: { paddingTop: space.md, paddingBottom: space.lg, gap: space.sm },
  limitLabel: { paddingHorizontal: gutter },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: rule.hair, paddingHorizontal: gutter },
  chip: {
    minHeight: 56,
    minWidth: 72,
    paddingHorizontal: space.md,
    alignItems: 'flex-start',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderWidth: rule.hair,
    borderColor: palette.border,
  },
  chipSelected: { backgroundColor: palette.accent, borderColor: palette.accent },
  onAccent: { color: palette.bg },
  pressedTint: { backgroundColor: 'rgba(32,30,29,0.10)' },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: gutter,
    paddingBottom: space.lg,
  },
  profileText: { flex: 1, gap: 2 },
  gameRow: {
    flexDirection: 'row',
    gap: space.md,
    alignItems: 'center',
    minHeight: hitTarget,
    paddingHorizontal: gutter,
    paddingVertical: space.md,
    borderTopWidth: rule.hair,
    borderTopColor: palette.border,
  },
  gameMark: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
  },
  gameText: { flex: 1, gap: 2 },
  gap: { marginTop: space.md },
});
