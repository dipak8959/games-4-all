import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { font, hitTarget, palette, rule, space } from '../theme/tokens';
import { fonts, type } from '../theme/type';

/**
 * The parts every game is built from.
 *
 * Before this existed each game drew its own buttons, its own panel and its
 * own press feedback, so seven games drifted into seven dialects of the same
 * idea — solid colour blocks here, 4px borders there, a bounce on press in
 * one and a fade in another. The design is a system; a game is not exempt
 * from it just because it is the fun part.
 *
 * So: one panel, one button, one row, one press state, all built from the
 * same tokens as the rest of the app. A game screen decides *what* is on the
 * stage and what the buttons say. It does not decide what a button looks
 * like.
 *
 * Colour inside a game is now spent only where colour is the content — the
 * shapes you sort by colour. Everywhere else a tile is ink on a surface, and
 * the accent marks the one thing that is live: the tile lighting up, the
 * answer under your finger.
 */

/**
 * A machine label naming the task: `COUNT THEM`, `MATCH THE COLOUR`.
 *
 * `live` is for a label that changes mid-round — Pattern Play switching from
 * "watch" to "repeat" — so a screen reader announces the change rather than
 * leaving a blind player waiting for a cue they cannot see.
 */
export function StageLabel({
  children,
  live = false,
}: {
  readonly children: React.ReactNode;
  readonly live?: boolean;
}) {
  return (
    <View style={styles.label}>
      <Text
        style={type.mono}
        accessibilityRole="header"
        accessibilityLiveRegion={live ? 'polite' : 'none'}
      >
        {children}
      </Text>
    </View>
  );
}

/**
 * The band a game's prompt sits in.
 *
 * Rules, not a box: a hairline above and below and the ground showing
 * through, the same way every section of Home is divided. Drawn as a
 * bordered panel it became a large grey rectangle with a small prompt
 * floating in the middle of it, which is the one thing this design never
 * does.
 */
export function GameStage({
  children,
  style,
}: {
  readonly children: React.ReactNode;
  readonly style?: ViewStyle;
}) {
  return <View style={[styles.stage, style]}>{children}</View>;
}

/** A row of answers, divided by the same 1px gaps as every grid in the app. */
export function AnswerRow({
  children,
  style,
}: {
  readonly children: React.ReactNode;
  readonly style?: ViewStyle;
}) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export type AnswerState =
  /** Available. */
  | 'idle'
  /** Lit by the game itself — the tile in a sequence being shown. */
  | 'active'
  /** Already used, or ruled out by a wrong guess. Still visible, not gone. */
  | 'spent';

/**
 * One thing a child can tap to answer with.
 *
 * `spent` is drawn at the design's disabled opacity rather than recoloured:
 * a ruled-out answer should read as the same answer, dimmed, not as a
 * different kind of object.
 */
export function AnswerButton({
  label,
  children,
  onPress,
  state = 'idle',
  disabled = false,
  size = hitTarget + 16,
  activeTone = 'accent',
  accessibilityLabel,
}: {
  readonly label?: string;
  readonly children?: React.ReactNode;
  readonly onPress: () => void;
  readonly state?: AnswerState;
  readonly disabled?: boolean;
  readonly size?: number;
  /**
   * What "live" is filled with. Accent by default — but a button whose face
   * is a colour picture rather than a letter needs a fill that cannot
   * collide with it, and a red shape on an accent-red block is invisible.
   * Those pass `ink`.
   */
  readonly activeTone?: 'accent' | 'ink';
  readonly accessibilityLabel?: string;
}) {
  const activeStyle = activeTone === 'ink' ? styles.answerActiveInk : styles.answerActive;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || state === 'spent', selected: state === 'active' }}
      disabled={disabled || state === 'spent'}
      onPress={onPress}
      style={({ pressed }) => [
        styles.answer,
        { minWidth: size, minHeight: size },
        state === 'active' && activeStyle,
        state === 'spent' && styles.answerSpent,
        pressed && state === 'idle' && activeStyle,
      ]}
    >
      {label != null ? (
        <Text style={[styles.answerText, state === 'active' && styles.answerTextActive]}>
          {label}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: { paddingBottom: space.sm },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.lg,
    marginBottom: space.lg,
    borderTopWidth: rule.hair,
    borderBottomWidth: rule.hair,
    borderColor: palette.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: rule.hair,
    paddingBottom: space.md,
  },
  answer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.sm,
    backgroundColor: palette.surface,
    borderWidth: rule.hair,
    borderColor: palette.border,
  },
  // Press and "lit" are the same state visually — in both cases this is the
  // one live thing on screen, which is exactly what the accent is for.
  answerActive: { backgroundColor: palette.accent, borderColor: palette.accent },
  answerActiveInk: { backgroundColor: palette.ink, borderColor: palette.ink },
  answerSpent: { opacity: 0.45 },
  answerText: { fontFamily: fonts.heavy, fontSize: font.h2, color: palette.ink },
  answerTextActive: { color: palette.bg },
});
