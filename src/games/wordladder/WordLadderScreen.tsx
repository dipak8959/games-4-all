import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AnswerButton, AnswerRow, GameStage, StageLabel } from '../../components/GameStage';
import { GameFrame } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { font, palette, rule, space } from '../../theme/tokens';
import { fonts } from '../../theme/type';
import { systemRng } from '../../util/random';
import { nextLevel, starsForMistakes, type GameScreenProps } from '../types';
import { LADDERS_PER_ROUND, choose, createGame, nextLadder, type WordLadderState } from './logic';

/** How long a climbed ladder stays on show before the next one. */
const DONE_MS = 1300;

/** One word on the ladder, with the letter that changed to reach it picked
 *  out — in the accent and underlined, so it isn't colour alone. */
function Rung({ word, previous, current }: { word: string; previous?: string; current: boolean }) {
  return (
    <View style={styles.rung}>
      {[...word].map((ch, i) => {
        const changed = previous !== undefined && previous[i] !== ch;
        return (
          <Text key={i} style={[styles.letter, current && styles.current, changed && styles.changed]}>
            {ch.toUpperCase()}
          </Text>
        );
      })}
    </View>
  );
}

export function WordLadderScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<WordLadderState>(() => createGame(systemRng, level));

  useEffect(() => {
    if (!state.done) return undefined;
    const on = setTimeout(() => setState((prev) => nextLadder(prev, systemRng, level)), DONE_MS);
    return () => clearTimeout(on);
  }, [state.done, level]);

  const onChoose = useCallback(
    (word: string) => {
      setState((prev) => {
        if (prev.complete || prev.done || prev.ruledOut.includes(word)) return prev;
        if (word === prev.ladder.rungs[prev.step].answer) correct(settings);
        else nudge(settings);
        return choose(prev, word);
      });
    },
    [settings],
  );

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    setState(createGame(systemRng, atLevel));
  }, []);

  const { path, rungs } = state.ladder;
  const goal = path[path.length - 1];
  const rung = rungs[Math.min(state.step, rungs.length - 1)];

  const stars = starsForMistakes(state.mistakes);
  const progress = (state.ladderIndex + state.step / rungs.length) / LADDERS_PER_ROUND;

  return (
    <GameFrame title="Word Ladder" icon="ladder" onExit={onExit} progress={progress}>
      <StageLabel>{`${path[0].toUpperCase()} TO ${goal.toUpperCase()}, ONE LETTER AT A TIME`}</StageLabel>

      <GameStage>
        <View
          accessible
          accessibilityLabel={`${path.slice(0, state.step + 1).join(', ')}. ${
            path.length - 2 - state.step > 0 ? `${path.length - 2 - state.step} more before ` : 'Next is '
          }${goal}`}
        >
          {path.map((word, i) => {
            if (i === path.length - 1) {
              return (
                <View key="goal" style={styles.goal}>
                  <Rung word={word} previous={state.done ? path[i - 1] : undefined} current />
                </View>
              );
            }
            if (i > state.step) {
              return (
                <View key={i} style={styles.rung}>
                  {[...word].map((_, j) => (
                    <Text key={j} style={[styles.letter, styles.blank]}>
                      _
                    </Text>
                  ))}
                </View>
              );
            }
            return <Rung key={i} word={word} previous={i > 0 ? path[i - 1] : undefined} current={i === state.step} />;
          })}
        </View>
      </GameStage>

      {/* Four words sit two by two rather than three and one. */}
      <AnswerRow style={rung.choices.length === 4 ? styles.pairs : undefined}>
        {rung.choices.map((word) => (
          <AnswerButton
            key={`${state.ladderIndex}:${state.step}:${word}`}
            label={word.toUpperCase()}
            accessibilityLabel={word}
            disabled={state.done}
            state={state.ruledOut.includes(word) ? 'spent' : 'idle'}
            onPress={() => onChoose(word)}
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
  rung: { flexDirection: 'row', justifyContent: 'center', gap: space.sm, paddingVertical: 2 },
  goal: { borderTopWidth: rule.major, borderColor: palette.ink, marginTop: space.xs, paddingTop: space.xs },
  letter: {
    width: 26,
    textAlign: 'center',
    fontFamily: fonts.heavy,
    fontSize: font.h3,
    color: palette.inkSoft,
  },
  current: { color: palette.ink },
  changed: { color: palette.accentText, textDecorationLine: 'underline' },
  blank: { color: palette.border },
  pairs: { maxWidth: 260, alignSelf: 'center' },
});
