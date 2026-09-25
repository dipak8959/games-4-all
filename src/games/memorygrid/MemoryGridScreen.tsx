import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';

import { AnswerButton, AnswerRow, StageLabel } from '../../components/GameStage';
import { GameFrame } from '../../components/GameFrame';
import { Icon } from '../../components/Icon';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge, tap } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { gutter, hitTarget, palette, rule, space } from '../../theme/tokens';
import { systemRng } from '../../util/random';
import { nextLevel, starsForMistakes, type GameScreenProps } from '../types';
import {
  PATTERNS_PER_ROUND,
  createGame,
  replay,
  specForLevel,
  startInput,
  tapCell,
  type MemoryGridState,
} from './logic';

/** A beat before the pattern appears, for the same reason as Pattern Play:
 *  shown on the frame the grid arrives, it's half over before it's seen. */
const LEAD_IN_MS = 700;

export function MemoryGridScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<MemoryGridState>(() => createGame(systemRng, level));
  // The pattern is only drawn once the lead-in is over.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!state.showing) return undefined;
    setVisible(false);
    const show = setTimeout(() => setVisible(true), LEAD_IN_MS);
    const hide = setTimeout(() => {
      setVisible(false);
      setState(startInput);
    }, LEAD_IN_MS + specForLevel(level).showMs);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [state.showing, state.patternIndex, level]);

  const onTap = useCallback(
    (cell: number) => {
      setState((prev) => {
        if (prev.showing || prev.complete || prev.found.includes(cell) || prev.missed.includes(cell)) return prev;
        if (prev.lit.includes(cell)) correct(settings);
        else nudge(settings);
        return tapCell(prev, cell, systemRng, level);
      });
    },
    [settings, level],
  );

  const onReplay = useCallback(() => {
    tap(settings);
    setState(replay);
  }, [settings]);

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    setState(createGame(systemRng, atLevel));
  }, []);

  const tile = useMemo(() => {
    const across = Dimensions.get('window').width - gutter * 2;
    return Math.max(hitTarget, Math.min(96, Math.floor((across - (state.size - 1) * rule.hair) / state.size)));
  }, [state.size]);

  const stars = starsForMistakes(state.mistakes);
  const progress = (state.patternIndex + state.found.length / state.lit.length) / PATTERNS_PER_ROUND;

  return (
    <GameFrame title="Memory Grid" icon="memorygrid" onExit={onExit} progress={progress}>
      <View style={styles.stage}>
        <StageLabel live>{state.showing ? 'REMEMBER THE SQUARES' : 'TAP THE ONES THAT LIT UP'}</StageLabel>

        <AnswerRow style={{ maxWidth: state.size * tile + (state.size - 1) * rule.hair, alignSelf: 'center' }}>
          {Array.from({ length: state.size * state.size }, (_, cell) => {
            const shown = state.showing && visible && state.lit.includes(cell);
            const found = state.found.includes(cell);
            const missed = state.missed.includes(cell);
            // As in Pattern Play, the state is in the name as well as the
            // fill: react-native-web drops `selected` on a button.
            const status = shown ? ', lit' : found ? ', found' : missed ? ', not this one' : '';
            return (
              <AnswerButton
                key={cell}
                accessibilityLabel={`Row ${Math.floor(cell / state.size) + 1}, column ${(cell % state.size) + 1}${status}`}
                size={tile}
                disabled={state.showing}
                state={shown || found ? 'active' : missed ? 'spent' : 'idle'}
                onPress={() => onTap(cell)}
              >
                {missed ? <Icon name="close" size={24} color={palette.ink} /> : null}
              </AnswerButton>
            );
          })}
        </AnswerRow>

        <AnswerRow style={styles.replay}>
          <AnswerButton
            accessibilityLabel="Show the squares again"
            size={hitTarget}
            disabled={state.showing}
            state={state.showing ? 'spent' : 'idle'}
            onPress={onReplay}
          >
            <Icon name="replay" size={34} color={palette.ink} />
          </AnswerButton>
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
  replay: { paddingTop: space.lg },
});
