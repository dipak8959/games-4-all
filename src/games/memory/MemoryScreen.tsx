import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';

import { StageLabel } from '../../components/GameStage';
import { GameFrame } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge, tap } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { font, gutter, palette, rule } from '../../theme/tokens';
import { systemRng } from '../../util/random';
import { nextLevel, starsForMistakes, type GameScreenProps } from '../types';
import { createGame, flip, hasPendingPair, resolvePair, type MemoryState } from './logic';

/** How long an unmatched pair stays visible before flipping back. Long enough
 *  for a young child to register both cards. */
const PEEK_MS = 1100;

const GAME_ID = 'memory';

export function MemoryScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings, getFreshness, setFreshness } = useApp();
  // The prop only seeds the first round; from here the screen adapts locally
  // each round (via `nextLevel`) so "Play again" reflects the new difficulty
  // immediately, without waiting on a round-trip through app-level state.
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<MemoryState>(() => {
    // Reading this once at mount, not reactively, means a parent finishing a
    // round elsewhere can't retroactively change a round already in progress.
    const lastShown = getFreshness(GAME_ID);
    return createGame(systemRng, level, new Set(Array.isArray(lastShown) ? lastShown : []));
  });
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  // Resolve a revealed pair after a peek delay.
  useEffect(() => {
    if (!hasPendingPair(state)) return;

    const [a, b] = state.revealed;
    const isMatch = state.cards[a].symbol === state.cards[b].symbol;
    if (isMatch) correct(settings);
    else nudge(settings);

    timer.current = setTimeout(() => {
      setState((prev) => resolvePair(prev));
    }, isMatch ? PEEK_MS / 2 : PEEK_MS);

    return clearTimer;
  }, [state, settings, clearTimer]);

  useEffect(() => {
    if (!state.complete || done) return;
    setDone(true);
    // Persisted (not just kept in local state) so the very next time this
    // game is opened — even after backing out to Home, even after the app
    // is closed and reopened — it still avoids what was just shown.
    setFreshness(GAME_ID, state.cards.map((c) => c.symbol));
  }, [state.complete, done, state.cards, setFreshness]);

  const onFlip = useCallback(
    (index: number) => {
      tap(settings);
      setState((prev) => flip(prev, index));
    },
    [settings],
  );

  const restart = useCallback(
    (atLevel: number, avoidSymbols: ReadonlySet<string>) => {
      clearTimer();
      setDone(false);
      setLevel(atLevel);
      setState(createGame(systemRng, atLevel, avoidSymbols));
    },
    [clearTimer],
  );

  const matched = state.cards.filter((c) => c.matched).length;
  const progress = state.cards.length ? matched / state.cards.length : 0;

  const columns = state.cards.length <= 8 ? 3 : 4;
  const size = useMemo(() => {
    const width = Dimensions.get('window').width - gutter * 2;
    return Math.floor((width - rule.hair * (columns - 1)) / columns);
  }, [columns]);

  return (
    <GameFrame title="Find the Pairs" icon="pairs" onExit={onExit} progress={progress}>
      <StageLabel>MATCH THE PAIRS</StageLabel>
      <View style={[styles.grid, { maxWidth: columns * (size + rule.hair) }]}>
        {state.cards.map((card, index) => {
          const visible = card.faceUp || card.matched;

          return (
            <Pressable
              key={card.id}
              accessibilityRole="button"
              accessibilityLabel={visible ? `Card showing ${card.symbol}` : 'Face down card'}
              accessibilityState={{ selected: visible, disabled: card.matched }}
              onPress={() => onFlip(index)}
              style={({ pressed }) => [
                styles.card,
                { width: size, height: size },
                visible ? styles.cardUp : styles.cardDown,
                card.matched && styles.matched,
                pressed && !visible && styles.pressed,
              ]}
            >
              {/* A face-down card is a blank, so it is drawn as one: an ink
                  block. The symbols are the game's content and carry all the
                  colour it needs — `card.colorIndex` is deliberately unused
                  now, since a tile's own picture already tells it apart. */}
              <Text style={[styles.symbol, { fontSize: size * 0.5 }, !visible && styles.symbolDown]}>
                {visible ? card.symbol : '?'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {done ? (
        <RoundComplete
          stars={starsForMistakes(state.mistakes)}
          reduceMotion={settings.reduceMotion}
          onPlayAgain={() => {
            const stars = starsForMistakes(state.mistakes);
            onRoundComplete({ stars, level });
            const usedSymbols = new Set(state.cards.map((c) => c.symbol));
            restart(nextLevel(level, stars), usedSymbols);
          }}
          onExit={() => {
            onRoundComplete({ stars: starsForMistakes(state.mistakes), level });
            onExit();
          }}
        />
      ) : null}
    </GameFrame>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rule.hair,
    justifyContent: 'flex-start',
    alignContent: 'center',
    alignSelf: 'center',
    flex: 1,
  },
  card: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  cardDown: { backgroundColor: palette.ink },
  cardUp: {
    backgroundColor: palette.surface,
    borderWidth: rule.hair,
    borderColor: palette.border,
  },
  // A matched pair is settled, not gone: the accent tint marks it the same
  // way a filled blank is marked in Spell It!.
  matched: { backgroundColor: palette.accentTint, borderColor: palette.accentTint },
  pressed: { backgroundColor: palette.accent },
  symbol: { fontSize: font.h2 },
  symbolDown: { color: palette.bg },
});
