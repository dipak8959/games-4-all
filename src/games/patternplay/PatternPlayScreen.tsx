import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AnswerButton, AnswerRow, StageLabel } from '../../components/GameStage';
import { PatternMark } from './PatternMark';
import { MARK_LABELS, markFor } from './marks';
import { GameFrame } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { hitTarget, palette, rule } from '../../theme/tokens';
import { systemRng } from '../../util/random';
import { nextLevel, starsForMistakes, type GameScreenProps } from '../types';
import { createGame, startInput, tapTile, type PatternPlayState } from './logic';


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

  // Square-ish boards: 4 tiles want 2x2, 6 want 3x2, 9 want 3x3. Fixing the
  // row at three wrapped a four-tile board to 3+1, leaving one tile stranded
  // on its own line.
  const columns = Math.ceil(Math.sqrt(state.tileCount));
  const tile = hitTarget + 16;

  const stars = starsForMistakes(state.mistakes);
  const progress = state.revealing ? 0 : state.inputIndex / state.sequence.length;

  return (
    <GameFrame title="Pattern Play" icon="sequence" onExit={onExit} progress={progress}>
      <View style={styles.stage}>
        <StageLabel live>{state.revealing ? 'WATCH THE PATTERN' : 'NOW REPEAT IT BACK'}</StageLabel>

        <AnswerRow style={[styles.grid, { maxWidth: columns * tile + (columns - 1) * rule.hair }]}>
          {Array.from({ length: state.tileCount }, (_, i) => {
            const mark = markFor(i);
            const lit = revealIndex === i;
            return (
              <AnswerButton
                key={i}
                accessibilityLabel={`${MARK_LABELS[mark]} tile`}
                state={lit ? 'active' : 'idle'}
                disabled={state.revealing}
                onPress={() => onTapTile(i)}
              >
                {/* The mark takes the colour it is given, so a lit tile
                    inverts to the ground rather than needing a fill its face
                    can survive. */}
                <PatternMark name={mark} size={34} color={lit ? palette.bg : palette.ink} />
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
  grid: { alignSelf: 'center' },
});
