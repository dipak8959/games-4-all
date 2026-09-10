import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AnswerButton, AnswerRow, StageLabel } from '../../components/GameStage';
import { GameFrame } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { font, hitTarget, palette, space } from '../../theme/tokens';
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
        <StageLabel live>{state.revealing ? 'WATCH THE PATTERN' : 'NOW REPEAT IT BACK'}</StageLabel>

        <AnswerRow style={styles.grid}>
          {Array.from({ length: state.tileCount }, (_, i) => {
            const glyph = TILE_GLYPHS[i % TILE_GLYPHS.length];
            return (
              <AnswerButton
                key={i}
                accessibilityLabel={`Tile ${glyph}`}
                // Lit tiles go ink rather than accent: these faces are colour
                // pictures, and a red one on an accent-red block disappears.
                state={revealIndex === i ? 'active' : 'idle'}
                activeTone="ink"
                disabled={state.revealing}
                onPress={() => onTapTile(i)}
              >
                <Text style={[styles.glyph, revealIndex === i && styles.glyphLit]}>{glyph}</Text>
              </AnswerButton>
            );
          })}
        </AnswerRow>
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
  stage: { flex: 1, justifyContent: 'center' },
  grid: { maxWidth: 3 * (hitTarget + 16) + space.sm, alignSelf: 'center' },
  glyph: { fontSize: font.h2, color: palette.ink },
  glyphLit: { color: palette.bg },
});
