import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AnswerButton, AnswerRow, GameStage, StageLabel } from '../../components/GameStage';
import { GameFrame } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { palette } from '../../theme/tokens';
import { fonts } from '../../theme/type';
import { systemRng } from '../../util/random';
import { nextLevel, starsForMistakes, type GameScreenProps } from '../types';
import { RHYMES_PER_ROUND, choose, createGame, type RhymeTimeState } from './logic';

export function RhymeTimeScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<RhymeTimeState>(() => createGame(systemRng, level));

  const onChoose = useCallback(
    (choice: number) => {
      setState((prev) => {
        if (prev.complete || prev.ruledOut.includes(choice)) return prev;
        if (choice === prev.questions[prev.index].answer) correct(settings);
        else nudge(settings);
        return choose(prev, choice);
      });
    },
    [settings],
  );

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    setState(createGame(systemRng, atLevel));
  }, []);

  const q = state.questions[Math.min(state.index, state.questions.length - 1)];
  const stars = starsForMistakes(state.mistakes);

  return (
    <GameFrame title="Rhyme Time" icon="rhyme" onExit={onExit} progress={state.index / RHYMES_PER_ROUND}>
      <StageLabel>WHICH WORD RHYMES WITH</StageLabel>
      <GameStage>
        <View accessible accessibilityLabel={`Which word rhymes with ${q.prompt}?`} testID={`prompt:${q.prompt}`}>
          <Text allowFontScaling={false} style={styles.prompt}>
            {q.prompt}
          </Text>
        </View>
      </GameStage>

      <AnswerRow>
        {q.choices.map((word, i) => (
          <AnswerButton
            key={`${state.index}:${word}`}
            label={word}
            size={132}
            state={state.ruledOut.includes(i) ? 'spent' : 'idle'}
            onPress={() => onChoose(i)}
          />
        ))}
      </AnswerRow>

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
  prompt: { fontFamily: fonts.heavy, fontSize: 64, lineHeight: 72, color: palette.ink, textAlign: 'center' },
});
