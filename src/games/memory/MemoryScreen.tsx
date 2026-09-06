import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';

import { GameFrame } from '../../components/GameFrame';
import { GradientSurface } from '../../components/GradientSurface';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge, tap } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { font, gradients, palette, playColors, radius, shadow, space } from '../../theme/tokens';
import { systemRng } from '../../util/random';
import { nextLevel, starsForMistakes, type GameScreenProps } from '../types';
import { createGame, flip, hasPendingPair, resolvePair, type MemoryState } from './logic';

/** How long an unmatched pair stays visible before flipping back. Long enough
 *  for a young child to register both cards. */
const PEEK_MS = 1100;

export function MemoryScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  // The prop only seeds the first round; from here the screen adapts locally
  // each round (via `nextLevel`) so "Play again" reflects the new difficulty
  // immediately, without waiting on a round-trip through app-level state.
  const [level, setLevel] = useState(initialLevel);
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
    const width = Dimensions.get('window').width - space.md * 2;
    return Math.floor((width - space.sm * (columns - 1)) / columns);
  }, [columns]);

  return (
    <GameFrame title="Find the Pairs" icon="🧠" onExit={onExit} progress={progress}>
      <View style={[styles.grid, { maxWidth: columns * (size + space.sm) }]}>
        {state.cards.map((card, index) => {
          const visible = card.faceUp || card.matched;
          const accent = playColors[card.colorIndex % playColors.length];

          return (
            <Pressable
              key={card.id}
              accessibilityRole="button"
              accessibilityLabel={visible ? `Card showing ${card.symbol}` : 'Face down card'}
              accessibilityState={{ selected: visible, disabled: card.matched }}
              onPress={() => onFlip(index)}
              style={({ pressed }) => [
                styles.cardOuter,
                { width: size, height: size, borderColor: visible ? accent : palette.deep },
                card.matched && styles.matched,
                pressed && !visible && styles.pressed,
              ]}
            >
              <View style={styles.cardInner}>
                {visible ? (
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.surface }]} />
                ) : (
                  <GradientSurface colors={gradients.sky} style={StyleSheet.absoluteFill} />
                )}
                <Text style={[styles.symbol, { fontSize: size * 0.5 }]}>
                  {visible ? card.symbol : '❓'}
                </Text>
              </View>
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
    gap: space.sm,
    justifyContent: 'center',
    alignContent: 'center',
    alignSelf: 'center',
    flex: 1,
  },
  cardOuter: { borderRadius: radius.md, borderWidth: 4, ...shadow },
  cardInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  matched: { opacity: 0.55 },
  pressed: { transform: [{ scale: 0.95 }] },
  symbol: { fontSize: font.title },
});
