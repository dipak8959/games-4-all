import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { AnswerButton, AnswerRow, GameStage, StageLabel } from '../../components/GameStage';
import { GameFrame } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { font, palette } from '../../theme/tokens';
import { fonts } from '../../theme/type';
import { systemRng } from '../../util/random';
import { nextLevel, starsForMistakes, type GameScreenProps } from '../types';
import { answer, createGame, QUESTIONS_PER_ROUND, type NumberCrunchState } from './logic';

const GAME_ID = 'numbercrunch';

function questionKey(state: NumberCrunchState): string {
  return `${state.question.a}${state.question.operator}${state.question.b}`;
}

export function NumberCrunchScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings, getFreshness, setFreshness } = useApp();
  // The prop only seeds the first round; from here the screen adapts locally
  // each round (via `nextLevel`) so "Play again" reflects the new difficulty
  // immediately, without waiting on a round-trip through app-level state.
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<NumberCrunchState>(() => {
    // Reading this once at mount, not reactively — see CountingScreen for why.
    const lastShown = getFreshness(GAME_ID);
    return createGame(systemRng, level, typeof lastShown === 'string' ? lastShown : null);
  });
  const persistedRef = useRef(false);

  const onChoose = useCallback(
    (choice: number) => {
      setState((prev) => {
        const next = answer(prev, choice, systemRng, level);
        if (choice === prev.question.answer) correct(settings);
        else nudge(settings);
        return next;
      });
    },
    [level, settings],
  );

  const restart = useCallback((atLevel: number, avoidKey: string | null) => {
    persistedRef.current = false;
    setLevel(atLevel);
    setState(createGame(systemRng, atLevel, avoidKey));
  }, []);

  useEffect(() => {
    if (!state.complete || persistedRef.current) return;
    persistedRef.current = true;
    // Persisted so the very next round — even after backing out to Home,
    // even after the app is closed and reopened — still avoids repeating
    // the exact question this round just ended on.
    setFreshness(GAME_ID, questionKey(state));
  }, [state, setFreshness]);

  const stars = starsForMistakes(state.mistakes);
  const progress = state.questionIndex / QUESTIONS_PER_ROUND;

  return (
    <GameFrame title="Number Crunch" icon="math" onExit={onExit} progress={progress}>
      <StageLabel>WORK IT OUT</StageLabel>
      <GameStage>
        <Text
          style={styles.sum}
          accessibilityLabel={`${state.question.a} ${state.question.operator} ${state.question.b}`}
        >
          {state.question.a} {state.question.operator} {state.question.b}
        </Text>
      </GameStage>

      <AnswerRow>
        {state.question.choices.map((choice) => (
          <AnswerButton
            key={choice}
            label={`${choice}`}
            state={state.ruledOut.includes(choice) ? 'spent' : 'idle'}
            onPress={() => onChoose(choice)}
          />
        ))}
      </AnswerRow>

      {state.complete ? (
        <RoundComplete
          stars={stars}
          reduceMotion={settings.reduceMotion}
          onPlayAgain={() => {
            onRoundComplete({ stars, level });
            restart(nextLevel(level, stars), questionKey(state));
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
  sum: { fontFamily: fonts.heavy, fontSize: font.display, color: palette.ink },
});
