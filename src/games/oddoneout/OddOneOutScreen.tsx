import React, { useCallback, useMemo, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';

import { AnswerButton, AnswerRow, StageLabel } from '../../components/GameStage';
import { GameFrame } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { gutter, hitTarget, rule } from '../../theme/tokens';
import { systemRng } from '../../util/random';
import { Shape, describe } from '../shapes/Shape';
import { nextLevel, starsForMistakes, type GameScreenProps } from '../types';
import { choose, createGame, QUESTIONS_PER_ROUND, type Look, type OddOneOutState } from './logic';

/** What a screen reader says for one shape — every way it can differ, so
 *  a child who can't see the group can still find the odd one by ear. */
function spoken(look: Look): string {
  const size = look.scale < 1 ? 'small ' : '';
  const way = look.turned ? 'upside-down ' : '';
  return `${size}${way}${describe(look.shape, look.color)}`;
}

export function OddOneOutScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  // The prop only seeds the first round; "Play again" adapts locally, like
  // every other game.
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<OddOneOutState>(() => createGame(systemRng, level));

  const onChoose = useCallback(
    (index: number) => {
      setState((prev) => {
        if (prev.complete || prev.ruledOut.includes(index)) return prev;
        if (index === prev.question.odd) correct(settings);
        else nudge(settings);
        return choose(prev, index, systemRng, level);
      });
    },
    [settings, level],
  );

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    setState(createGame(systemRng, atLevel));
  }, []);

  const { items } = state.question;
  // Near-square groups: 3 in a row, 4 as 2x2, 6 and 9 in threes, 12 and 16
  // in fours. Four full-size targets fit across a phone.
  const columns = items.length === 4 ? 2 : items.length <= 9 ? 3 : 4;
  const tile = useMemo(() => {
    const across = Dimensions.get('window').width - gutter * 2;
    return Math.max(hitTarget, Math.min(104, Math.floor((across - (columns - 1) * rule.hair) / columns)));
  }, [columns]);

  const stars = starsForMistakes(state.mistakes);
  const progress = state.questionIndex / QUESTIONS_PER_ROUND;

  return (
    <GameFrame title="Odd One Out" icon="odd" onExit={onExit} progress={progress}>
      <StageLabel>FIND THE ODD ONE OUT</StageLabel>
      <View style={styles.stage}>
        <AnswerRow style={{ maxWidth: columns * tile + (columns - 1) * rule.hair, alignSelf: 'center' }}>
          {items.map((look, i) => (
            <AnswerButton
              key={`${state.questionIndex}:${i}`}
              accessibilityLabel={spoken(look)}
              size={tile}
              state={state.ruledOut.includes(i) ? 'spent' : 'idle'}
              onPress={() => onChoose(i)}
            >
              <View style={look.turned ? styles.turned : undefined}>
                <Shape shape={look.shape} color={look.color} size={tile * 0.56 * look.scale} />
              </View>
            </AnswerButton>
          ))}
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
  turned: { transform: [{ rotate: '180deg' }] },
});
