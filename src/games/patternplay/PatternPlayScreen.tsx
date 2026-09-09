import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GameFrame } from '../../components/GameFrame';
import { GradientSurface } from '../../components/GradientSurface';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { font, gradients, hitTarget, palette, radius, shadow, space } from '../../theme/tokens';
import { systemRng } from '../../util/random';
import { nextLevel, starsForMistakes, type GameScreenProps } from '../types';
import { createGame, startInput, tapTile, type PatternPlayState } from './logic';

/** One glyph per tile so the sequence never depends on colour alone to be
 *  followed — see SAFETY.md's "colour is never the only signal" rule. Fixed
 *  order, so a given tile index always shows the same glyph within a round. */
const TILE_GLYPHS = ['⭐', '🔵', '🔺', '🌙', '☀️', '🍀', '🎵', '🎈', '💎'] as const;

/** How long each tile stays highlighted during the reveal, and the gap
 *  between them — long enough to register, short enough not to drag. */
const REVEAL_ON_MS = 550;
const REVEAL_GAP_MS = 220;

export function PatternPlayScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  // The prop only seeds the first round; from here the screen adapts locally
  // each round (via `nextLevel`) so "Play again" reflects the new difficulty
  // immediately, without waiting on a round-trip through app-level state.
  const [level, setLevel] = useState(initialLevel);
  // No freshness bookkeeping here — see logic.ts: every sequence is freshly
  // randomised, so there's nothing pooled to avoid repeating.
  const [state, setState] = useState<PatternPlayState>(() => createGame(systemRng, level));
  const [revealIndex, setRevealIndex] = useState<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  // Plays the reveal: highlight each tile in sequence, then flip to input.
  useEffect(() => {
    if (!state.revealing) return;
    clearTimers();
    setRevealIndex(null);

    state.sequence.forEach((tile, i) => {
      const onAt = i * (REVEAL_ON_MS + REVEAL_GAP_MS);
      timers.current.push(setTimeout(() => setRevealIndex(tile), onAt));
      timers.current.push(setTimeout(() => setRevealIndex(null), onAt + REVEAL_ON_MS));
    });

    const doneAt = state.sequence.length * (REVEAL_ON_MS + REVEAL_GAP_MS);
    timers.current.push(
      setTimeout(() => {
        setState((prev) => startInput(prev));
      }, doneAt),
    );

    return clearTimers;

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.revealing, state.sequence]);

  const onTapTile = useCallback(
    (tileIndex: number) => {
      setState((prev) => {
        if (prev.complete || prev.revealing) return prev;
        const expected = prev.sequence[prev.inputIndex];
        if (tileIndex === expected) correct(settings);
        else nudge(settings);
        return tapTile(prev, tileIndex);
      });
    },
    [settings],
  );

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    setState(createGame(systemRng, atLevel));
  }, []);

  const stars = starsForMistakes(state.mistakes);
  const progress = state.revealing ? 0 : state.inputIndex / state.sequence.length;

  return (
    <GameFrame title="Pattern Play" icon="sequence" onExit={onExit} progress={progress}>
      <View style={styles.stage}>
        <Text style={styles.hint} accessibilityLiveRegion="polite">
          {state.revealing ? 'Watch the pattern…' : 'Now repeat it back!'}
        </Text>

        <View style={styles.grid}>
          {Array.from({ length: state.tileCount }, (_, i) => {
            const lit = revealIndex === i;
            return (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityLabel={`Tile ${TILE_GLYPHS[i % TILE_GLYPHS.length]}`}
                accessibilityState={{ disabled: state.revealing, selected: lit }}
                disabled={state.revealing}
                onPress={() => onTapTile(i)}
                style={({ pressed }) => [
                  styles.tileOuter,
                  pressed && !state.revealing && styles.pressed,
                ]}
              >
                {lit ? (
                  <GradientSurface colors={gradients.deep} style={styles.tileInner}>
                    <Text style={styles.tileGlyph}>{TILE_GLYPHS[i % TILE_GLYPHS.length]}</Text>
                  </GradientSurface>
                ) : (
                  <View style={[styles.tileInner, styles.tileIdle]}>
                    <Text style={styles.tileGlyph}>{TILE_GLYPHS[i % TILE_GLYPHS.length]}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {state.complete ? (
        <RoundComplete
          stars={stars}
          reduceMotion={settings.reduceMotion}
          onPlayAgain={() => {
            onRoundComplete({ stars, level });
            restart(nextLevel(level, stars));
          }}
          onExit={() => {
            onRoundComplete({ stars, level });
            onExit();
          }}
        />
      ) : null}
    </GameFrame>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg },
  hint: { fontSize: font.label, fontWeight: '700', color: palette.inkSoft, textAlign: 'center' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: space.md,
    maxWidth: 3 * (hitTarget + 24) + space.md * 2,
  },
  tileOuter: { width: hitTarget + 16, height: hitTarget + 16, borderRadius: radius.lg, ...shadow },
  tileInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  tileIdle: { backgroundColor: palette.surface, borderWidth: 2, borderColor: palette.border },
  tileGlyph: { fontSize: font.title },
  pressed: { transform: [{ scale: 0.95 }] },
});
