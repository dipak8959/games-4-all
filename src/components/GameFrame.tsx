import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BigButton } from './BigButton';
import { NumberedRow } from './FactGrid';
import { GameArt } from './GameArt';
import { Icon, type IconName } from './Icon';
import { Rule } from './Rule';
import { Screen } from './Screen';
import { findGameMeta } from '../games/catalog';
import { helpFor } from '../games/help';
import { gutter, hitTarget, palette, rule, space } from '../theme/tokens';
import { type } from '../theme/type';

/**
 * The game being played, and whether it's paused for "How to play".
 *
 * It sits above the game's screen (App wraps each game in a `GameSession`)
 * so that both the frame — which owns the "?" button and the help sheet —
 * and the game itself — which has to stop its clock while the sheet is up —
 * can read it.
 */
type Session = {
  readonly gameId: string;
  readonly paused: boolean;
  readonly setPaused: (paused: boolean) => void;
};

const SessionContext = createContext<Session | null>(null);

export function GameSession({ gameId, children }: { readonly gameId: string; readonly children: React.ReactNode }) {
  const [paused, setPaused] = useState(false);
  const value = useMemo(() => ({ gameId, paused, setPaused }), [gameId, paused]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/**
 * True while "How to play" is open. A game with a clock — anything that
 * moves on its own, or shows something for a set time — stops it while this
 * is true, so reading the help never costs a run, a race or a pattern.
 */
export function useGamePaused(): boolean {
  return useContext(SessionContext)?.paused ?? false;
}

/**
 * Chrome shared by every game: a back control, a title, a "How to play"
 * control, and a progress row.
 *
 * The back control is an arrow with a large hit area and no confirmation — a
 * child must always be able to leave a game immediately, without reading
 * anything or answering a dialog. "How to play" sits opposite it, top right,
 * in words, and closes the same way: one tap.
 */
export function GameFrame({
  title,
  icon,
  onExit,
  progress,
  children,
}: {
  readonly title: string;
  readonly icon: IconName;
  readonly onExit: () => void;
  /** 0-1, drives the progress bar. */
  readonly progress: number;
  readonly children: React.ReactNode;
}) {
  const clamped = Math.max(0, Math.min(1, progress));
  const session = useContext(SessionContext);
  const help = session ? helpFor(session.gameId) : undefined;
  const open = session?.paused ?? false;
  const setOpen = useCallback((next: boolean) => session?.setPaused(next), [session]);

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to games"
          onPress={onExit}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <Icon name="back" size={26} color={palette.ink} />
        </Pressable>

        <View style={styles.titleWrap}>
          <Icon name={icon} size={18} color={palette.ink} />
          <Text style={type.rowTitle} numberOfLines={1}>
            {title}
          </Text>
        </View>

        <Text style={type.mono}>{Math.round(clamped * 100)}%</Text>

        {help ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`How to play ${title}`}
            onPress={() => setOpen(true)}
            style={({ pressed }) => [styles.help, pressed && styles.pressed]}
          >
            <Text style={[type.monoStrong, styles.helpText]}>{'HOW TO\nPLAY'}</Text>
          </Pressable>
        ) : null}
      </View>

      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      >
        <View style={[styles.fill, { width: `${clamped * 100}%` }]} />
      </View>
      <Rule weight="major" />

      <View style={styles.body}>{children}</View>

      {help && open && session ? (
        <HelpSheet gameId={session.gameId} title={title} onClose={() => setOpen(false)} />
      ) : null}
    </Screen>
  );
}

/** "How to play": the goal, the steps, an example, and how it grows — over
 *  the whole game, closed in one tap from the top or the bottom. */
function HelpSheet({ gameId, title, onClose }: { readonly gameId: string; readonly title: string; readonly onClose: () => void }) {
  const help = helpFor(gameId);
  const meta = findGameMeta(gameId);
  if (!help || !meta) return null;
  return (
    <View style={styles.sheet} accessibilityViewIsModal>
      <View style={styles.sheetHeader}>
        <View style={styles.sheetTitle}>
          <Text style={type.mono}>HOW TO PLAY</Text>
          <Text style={type.h3} accessibilityRole="header">
            {title}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close how to play"
          onPress={onClose}
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}
        >
          <Icon name="close" size={24} color={palette.ink} />
        </Pressable>
      </View>
      <Rule weight="major" />

      <ScrollView contentContainerStyle={styles.sheetBody}>
        <View style={styles.picture}>
          <GameArt id={gameId} color={meta.color} />
        </View>

        <Text style={[type.mono, styles.label]}>THE GOAL</Text>
        <Text style={[type.body, styles.copy]}>{help.goal}</Text>

        <Text style={[type.mono, styles.label]}>HOW TO PLAY</Text>
        {help.steps.map((step, i) => (
          <NumberedRow key={step} index={String(i + 1).padStart(2, '0')} copy={step} />
        ))}

        {help.example ? (
          <>
            <Text style={[type.mono, styles.label]}>FOR EXAMPLE</Text>
            <Text style={[type.body, styles.copy, styles.example]}>{help.example}</Text>
          </>
        ) : null}

        <Text style={[type.mono, styles.label]}>AS YOU GET BETTER</Text>
        <Text style={[type.body, styles.copy]}>{help.grows}</Text>

        <View style={styles.done}>
          <BigButton label="Back to the game" icon="back" onPress={onClose} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  back: {
    width: hitTarget,
    height: hitTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: rule.hair,
    borderRightColor: palette.border,
  },
  // Words rather than a "?", so a grown-up handing the phone over can see
  // what it does without guessing — on two lines, so a long game title
  // still fits beside it on a small phone.
  help: {
    minWidth: hitTarget,
    height: hitTarget,
    paddingHorizontal: space.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: rule.hair,
    borderLeftColor: palette.border,
  },
  helpText: { textAlign: 'center' },
  pressed: { backgroundColor: 'rgba(32,30,29,0.10)' },
  titleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  track: { height: 10, backgroundColor: palette.surface, borderTopWidth: rule.hair, borderTopColor: palette.border },
  fill: { height: '100%', backgroundColor: palette.ink },
  body: { flex: 1, paddingHorizontal: gutter, paddingTop: space.md },
  sheet: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: palette.bg },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', paddingLeft: gutter },
  sheetTitle: { flex: 1, gap: space.xs, paddingVertical: space.md },
  close: {
    width: hitTarget,
    height: hitTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: rule.hair,
    borderLeftColor: palette.border,
  },
  sheetBody: { paddingBottom: space.xxl },
  picture: { height: 140, flexDirection: 'row', marginBottom: space.md },
  label: { paddingHorizontal: gutter, paddingTop: space.lg, paddingBottom: space.sm },
  copy: { paddingHorizontal: gutter },
  example: { color: palette.ink },
  done: { paddingHorizontal: gutter, paddingTop: space.xl },
});
