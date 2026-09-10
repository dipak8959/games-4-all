import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AnswerButton, AnswerRow, GameStage, StageLabel } from '../../components/GameStage';
import { GameFrame } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { space } from '../../theme/tokens';
import { systemRng } from '../../util/random';
import { nextLevel, starsForMistakes, type GameScreenProps } from '../types';
import { answer, createGame, QUESTIONS_PER_ROUND, type CountingState } from './logic';

const GAME_ID = 'counting';

export function CountingScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings, getFreshness, setFreshness } = useApp();
  // The prop only seeds the first round; from here the screen adapts locally
  // each round (via `nextLevel`) so "Play again" reflects the new difficulty
  // immediately, without waiting on a round-trip through app-level state.
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<CountingState>(() => {
    // Reading this once at mount, not reactively — see MemoryScreen for why.
    const lastShown = getFreshness(GAME_ID);
    return createGame(systemRng, level, typeof lastShown === 'string' ? lastShown : null);
  });
  // Guards against persisting the same completed round twice; reset whenever
  // a new round actually starts. A ref rather than state because it drives
  // no rendering of its own.
  const persistedRef = useRef(false);

  const onChoose = useCallback(
    (choice: number) => {
      setState((prev) => {
        const next = answer(prev, choice, systemRng, level);
        if (choice === prev.question.count) correct(settings);
        else nudge(settings);
        return next;
      });
    },
    [level, settings],
  );

  const restart = useCallback((atLevel: number, avoidSymbol: string | null) => {
    persistedRef.current = false;
    setLevel(atLevel);
    setState(createGame(systemRng, atLevel, avoidSymbol));
  }, []);

  useEffect(() => {
    if (!state.complete || persistedRef.current) return;
    persistedRef.current = true;
    // Persisted so the very next time this game is opened — even after
    // backing out to Home, even after the app is closed and reopened — the
    // first question still avoids what was just shown.
    setFreshness(GAME_ID, state.question.symbol);
  }, [state.complete, state.question.symbol, setFreshness]);

  const stars = starsForMistakes(state.mistakes);
  const progress = state.questionIndex / QUESTIONS_PER_ROUND;

  // Few objects should be large and inviting; many should still fit the stage
  // without scrolling. Scaling with the count keeps the group visually similar
  // in weight whether the answer is 1 or 12.
  const objectSize = useMemo(() => {
    const count = state.question.count;
    if (count <= 3) return 96;
    if (count <= 6) return 76;
    if (count <= 9) return 62;
    return 52;
  }, [state.question.count]);

  return (
    <GameFrame title="How Many?" icon="count" onExit={onExit} progress={progress}>
      <StageLabel>COUNT THEM</StageLabel>
      <GameStage>
        <View style={styles.objects} accessibilityLabel={`${state.question.count} objects to count`}>
          {Array.from({ length: state.question.count }, (_, i) => (
            <Text key={i} style={{ fontSize: objectSize, lineHeight: objectSize * 1.2 }}>
              {state.question.symbol}
            </Text>
          ))}
        </View>
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
            restart(nextLevel(level, stars), state.question.symbol);
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
  objects: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.sm },
});
