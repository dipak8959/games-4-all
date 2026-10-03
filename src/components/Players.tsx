import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Shape } from '../games/shapes/Shape';
import type { ColorKind, ShapeKind } from '../games/shapes/logic';
import { font, palette, rule, space } from '../theme/tokens';
import { fonts, type } from '../theme/type';
import { AnswerButton, AnswerRow, StageLabel } from './GameStage';

/**
 * Players, for the games a group plays together on one device.
 *
 * A player is a number and a mark — a shape in its own colour — never a
 * name, so a child who can't read yet still knows it's their turn: "you're
 * the green triangle". Three signals, shape, colour and numeral, so none of
 * them has to carry it alone.
 *
 * Nothing here counts or compares players. Group games are played as one
 * team; the only thing a turn changes is whose hands are on the screen.
 */

export const MAX_PLAYERS = 6;

const MARKS: readonly { shape: ShapeKind; color: ColorKind; name: string }[] = [
  { shape: 'circle', color: 'berry', name: 'orange circle' },
  { shape: 'square', color: 'sky', name: 'blue square' },
  { shape: 'triangle', color: 'leaf', name: 'green triangle' },
  { shape: 'star', color: 'sun', name: 'yellow star' },
  { shape: 'diamond', color: 'grape', name: 'pink diamond' },
  { shape: 'heart', color: 'berry', name: 'orange heart' },
];

/** How a player is named aloud: "Player 2, the blue square". */
export function playerName(player: number): string {
  return `Player ${player + 1}, the ${MARKS[player % MARKS.length].name}`;
}

/** A player's mark: their shape, with their number on it. */
export function PlayerMark({ player, size }: { readonly player: number; readonly size: number }) {
  const mark = MARKS[player % MARKS.length];
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Shape shape={mark.shape} color={mark.color} size={size * 0.9} />
      <Text allowFontScaling={false} style={[styles.number, { fontSize: size * 0.34, lineHeight: size * 0.4 }]}>
        {player + 1}
      </Text>
    </View>
  );
}

// The last number of players chosen, for the next group game this session.
// Kept in memory only: nothing about who played is ever stored.
let remembered = 2;

/**
 * "How many players?" — big buttons, each showing that many marks, so the
 * choice can be made by counting.
 */
export function PlayersPicker({
  min = 2,
  max = MAX_PLAYERS,
  onPick,
}: {
  readonly min?: number;
  readonly max?: number;
  readonly onPick: (players: number) => void;
}) {
  return (
    <View style={styles.picker}>
      <StageLabel>HOW MANY PLAYERS?</StageLabel>
      <AnswerRow>
        {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => (
          <AnswerButton
            key={n}
            accessibilityLabel={`${n} players`}
            size={96}
            state={n === Math.max(min, Math.min(max, remembered)) ? 'active' : 'idle'}
            onPress={() => {
              remembered = n;
              onPick(n);
            }}
          >
            <Text allowFontScaling={false} style={styles.count}>
              {n}
            </Text>
            <View style={styles.marks}>
              {Array.from({ length: n }, (_, p) => (
                <PlayerMark key={p} player={p} size={18} />
              ))}
            </View>
          </AnswerButton>
        ))}
      </AnswerRow>
    </View>
  );
}

/** Whose turn it is, and what they're doing — the mark does the telling. */
export function TurnBanner({ player, doing }: { readonly player: number; readonly doing: string }) {
  return (
    <View style={styles.banner} accessible accessibilityRole="header" accessibilityLiveRegion="polite" accessibilityLabel={`${playerName(player)}: ${doing}`} testID={`turn:${player}`}>
      <PlayerMark player={player} size={44} />
      <View style={styles.bannerText}>
        <Text style={type.mono}>PLAYER {player + 1}</Text>
        <Text style={styles.doing}>{doing}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  picker: { flex: 1, justifyContent: 'center' },
  count: { fontFamily: fonts.heavy, fontSize: font.h2, color: palette.ink },
  marks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 70, marginTop: space.xs },
  number: { position: 'absolute', fontFamily: fonts.heavy, color: palette.ink, textAlign: 'center' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingBottom: space.sm,
    marginBottom: space.sm,
    borderBottomWidth: rule.hair,
    borderColor: palette.border,
  },
  bannerText: { flex: 1 },
  doing: { fontFamily: fonts.heavy, fontSize: font.body, color: palette.ink },
});
