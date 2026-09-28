import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AnswerButton, AnswerRow, GameStage, StageLabel } from '../../components/GameStage';
import { GameFrame } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { palette, rule, space } from '../../theme/tokens';
import { fonts } from '../../theme/type';
import { systemRng } from '../../util/random';
import { nextLevel, starsForMistakes, type GameScreenProps } from '../types';
import { ROWS, choose, createGame, rowNow, type NumberPatternsState } from './logic';

/** The gap is underlined this much heavier than the other boxes. */
const GAP_LINE = 4;

export function NumberPatternsScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<NumberPatternsState>(() => createGame(systemRng, level));

  const onChoose = useCallback(
    (choice: number) => {
      setState((prev) => {
        if (prev.complete || prev.ruledOut.includes(choice)) return prev;
        const row = rowNow(prev);
        if (row.choices[choice] === row.terms[row.gap]) correct(settings);
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

  const row = rowNow(state);
  const shown = row.terms.map((n, i) => (i === row.gap ? '?' : String(n)));
  const stars = starsForMistakes(state.mistakes);
  const big = Math.max(...row.terms) >= 100;

  return (
    <GameFrame title="Number Patterns" icon="sequence" onExit={onExit} progress={state.index / ROWS}>
      <StageLabel>WHAT GOES IN THE GAP?</StageLabel>
      <GameStage>
        <View style={styles.row} accessible accessibilityLabel={`${shown.join(', ').replace('?', 'gap')}. What goes in the gap?`} testID={`pattern:${shown.join(',')}`}>
          {shown.map((n, i) => (
            <View key={i} style={[styles.box, i === row.gap && [styles.gap, { borderBottomWidth: GAP_LINE }]]}>
              <Text allowFontScaling={false} style={[styles.term, big && styles.termSmall, i === row.gap && styles.gapText]}>
                {n}
              </Text>
            </View>
          ))}
        </View>
      </GameStage>

      <AnswerRow>
        {row.choices.map((n, i) => (
          <AnswerButton
            key={`${state.index}:${n}`}
            label={String(n)}
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
  row: { flexDirection: 'row', gap: space.xs, justifyContent: 'center', alignSelf: 'stretch' },
  box: {
    flex: 1,
    maxWidth: 72,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderWidth: rule.major,
    borderColor: palette.ink,
  },
  gap: { backgroundColor: palette.bg, borderBottomColor: palette.accent },
  term: { fontFamily: fonts.heavy, fontSize: 24, color: palette.ink },
  termSmall: { fontSize: 18 },
  gapText: { color: palette.inkSoft },
});
