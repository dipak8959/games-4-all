import React, { useMemo } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { font, gutter, hitTarget, palette, rule, space } from '../theme/tokens';
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
  readonly style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.stage, style]}>{children}</View>;
}

/** A row of answers, divided by the same 1px gaps as every grid in the app. */
export function AnswerRow({
  children,
  style,
}: {
  readonly children: React.ReactNode;
  readonly style?: StyleProp<ViewStyle>;
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
  accessibilityLabel,
}: {
  readonly label?: string;
  readonly children?: React.ReactNode;
  readonly onPress: () => void;
  readonly state?: AnswerState;
  readonly disabled?: boolean;
  readonly size?: number;
  readonly accessibilityLabel?: string;
}) {
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
        state === 'active' && styles.answerActive,
        state === 'spent' && styles.answerSpent,
        pressed && state === 'idle' && styles.answerActive,
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

/**
 * A row of arrow keys, all on one line on any phone. Four 80dp keys need
 * 323dp, more than a 320dp screen has, and a wrapped pad puts "right" under
 * "up". So the keys shrink towards the 72dp minimum first, and the row may
 * use the gutters as a grid does.
 */
export function useKeyRow(keys: number, max: number = hitTarget + 8): { size: number; style: ViewStyle } {
  return useMemo(() => {
    const { tile, rowWidth } = fitTiles(keys, max);
    return { size: tile, style: { width: rowWidth, alignSelf: 'center' } };
  }, [keys, max]);
}

/**
 * Tiles for a grid a given number of columns wide: as big as the screen
 * allows, up to `max`, and never under the 72dp minimum.
 *
 * On a narrow phone that minimum doesn't always fit inside the gutters —
 * four 72dp tiles and their rules need 291dp, and a 320dp screen has 288
 * between its gutters. Rather than let the row wrap (a four-wide grid drawn
 * three across, and pushed off the screen), the grid is allowed to use the
 * gutters too: `bleed` is the negative margin to give it on each side.
 */
export function fitTiles(
  columns: number,
  max: number,
  width: number = Dimensions.get('window').width,
): { tile: number; bleed: number; rowWidth: number } {
  const inside = width - gutter * 2;
  const fit = Math.floor((inside - (columns - 1) * rule.hair) / columns);
  const tile = Math.max(hitTarget, Math.min(max, fit));
  const rowWidth = columns * tile + (columns - 1) * rule.hair;
  const bleed = rowWidth > inside ? Math.min(gutter, Math.ceil((rowWidth - inside) / 2)) : 0;
  return { tile, bleed, rowWidth };
}

/**
 * Where a game's board sits when it might not fit the screen: centred when
 * it does, and scrolled when it doesn't — a tall grid on a small phone —
 * rather than spilling out over the header and the back button.
 */
export function StageScroll({
  children,
  style,
}: {
  readonly children: React.ReactNode;
  readonly style?: StyleProp<ViewStyle>;
}) {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollInner, style]} showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  );
}

/**
 * react-native-web's own name for "report a press the instant it starts".
 * Native Pressable already does; the web build waits 50ms unless told.
 */
const PRESS_AT_ONCE = { delayPressIn: 0 } as object;

/**
 * A button that works for as long as it's held — a thruster, not an answer.
 * It looks exactly like an answer and is lit while it's held down; `onHold`
 * hears `true` the instant the finger lands and `false` when it lifts.
 */
export function HoldButton({
  children,
  onHold,
  size = hitTarget + 16,
  accessibilityLabel,
  testID,
}: {
  readonly children: React.ReactNode;
  readonly onHold: (down: boolean) => void;
  readonly size?: number;
  readonly accessibilityLabel: string;
  readonly testID?: string;
}) {
  return (
    <Pressable
      {...PRESS_AT_ONCE}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      onPressIn={() => onHold(true)}
      onPressOut={() => onHold(false)}
      style={({ pressed }) => [styles.answer, { minWidth: size, minHeight: size }, pressed && styles.answerActive]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: { paddingBottom: space.sm },
  // Out to the screen's edges and padded back in, so a grid that borrows
  // the gutters (see `fitTiles`) isn't clipped by the scroll view.
  scroll: { flex: 1, marginHorizontal: -gutter },
  scrollInner: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: gutter },
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
  answerSpent: { opacity: 0.45 },
  answerText: { fontFamily: fonts.heavy, fontSize: font.h2, color: palette.ink },
  answerTextActive: { color: palette.bg },
});
