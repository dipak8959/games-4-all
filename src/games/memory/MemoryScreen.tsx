import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';

import { GameFrame } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge, tap } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { font, palette, playColors, radius, shadow, space } from '../../theme/tokens';
import { systemRng } from '../../util/random';
import { starsForMistakes, type GameScreenProps } from '../types';
import { createGame, flip, hasPendingPair, resolvePair, type MemoryState } from './logic';

/** How long an unmatched pair stays visible before flipping back. Long enough
 *  for a young child to register both cards. */
const PEEK_MS = 1100;

export function MemoryScreen({ level, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  const [state, setState] = useState<MemoryState>(() => createGame(systemRng, level));
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
    if (state.complete && !done) setDone(true);
  }, [state.complete, done]);

  const onFlip = useCallback(
    (index: number) => {
      tap(settings);
      setState((prev) => flip(prev, index));
    },
    [settings],
  );

  const restart = useCallback(() => {
    clearTimer();
    setDone(false);
    setState(createGame(systemRng, level));
  }, [clearTimer, level]);

  const matched = state.cards.filter((c) => c.matched).length;
  const progress = state.cards.length ? matched / state.cards.length : 0;

  const columns = state.cards.length <= 8 ? 3 : 4;
  const size = useMemo(() => {
    const width = Dimensions.get('window').width - space.md * 2;
    return Math.floor((width - space.sm * (columns - 1)) / columns);
  }, [columns]);

  return (
    <GameFrame title="Find the Pairs" icon="🧠" onExit={onExit} progress={progress}>
      <View style={[styles.grid, { maxWidth: columns * (size + space.sm) }]}>
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
                visible
                  ? { backgroundColor: palette.surface, borderColor: playColors[card.colorIndex % playColors.length] }
                  : styles.faceDown,
                card.matched && styles.matched,
                pressed && !visible && styles.pressed,
              ]}
            >
              <Text style={[styles.symbol, { fontSize: size * 0.5 }]}>
                {visible ? card.symbol : '❓'}
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
            onRoundComplete({ stars: starsForMistakes(state.mistakes), level });
            restart();
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
    gap: space.sm,
    justifyContent: 'center',
    alignContent: 'center',
    alignSelf: 'center',
    flex: 1,
  },
  card: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    ...shadow,
  },
  faceDown: { backgroundColor: palette.sky, borderColor: palette.deep },
  matched: { opacity: 0.55 },
  pressed: { transform: [{ scale: 0.95 }] },
  symbol: { fontSize: font.title },
});
