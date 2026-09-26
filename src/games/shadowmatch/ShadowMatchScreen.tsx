import React, { useCallback, useMemo, useState } from 'react';
import { Dimensions, View } from 'react-native';

import { AnswerButton, AnswerRow, GameStage, StageLabel } from '../../components/GameStage';
import { GameFrame } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { gutter, hitTarget, palette, rule } from '../../theme/tokens';
import { systemRng } from '../../util/random';
import { COLOR_NAMES, SHAPE_COLORS } from '../shapes/Shape';
import { nextLevel, starsForMistakes, type GameScreenProps } from '../types';
import { FigureView } from './Figure';
import { choose, createGame, QUESTIONS_PER_ROUND, type Shadow, type ShadowMatchState } from './logic';

/** What a screen reader says for a shadow: the thing, and whether it's on
 *  its side or upside down, so it can be matched by ear. */
function spoken(shadow: Shadow): string {
  const way =
    shadow.turn === 180 ? ', upside down' : shadow.turn === 90 || shadow.turn === 270 ? ', on its side' : '';
  return `Shadow of a ${shadow.figure.name}${way}`;
}

export function ShadowMatchScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<ShadowMatchState>(() => createGame(systemRng, level));

  const onChoose = useCallback(
    (index: number) => {
      setState((prev) => {
        if (prev.complete || prev.ruledOut.includes(index)) return prev;
        if (index === prev.question.answer) correct(settings);
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

  const { thing, color, shadows } = state.question;
  // Two or three in a row; four as two by two; six in threes.
  const columns = shadows.length === 4 ? 2 : 3;
  const tile = useMemo(() => {
    const across = Dimensions.get('window').width - gutter * 2;
    return Math.max(hitTarget, Math.min(120, Math.floor((across - (columns - 1) * rule.hair) / columns)));
  }, [columns]);

  const stars = starsForMistakes(state.mistakes);
  const progress = state.questionIndex / QUESTIONS_PER_ROUND;

  return (
    <GameFrame title="Shadow Match" icon="shadow" onExit={onExit} progress={progress}>
      <StageLabel>FIND ITS SHADOW</StageLabel>
      <GameStage>
        <View accessible accessibilityLabel={`A ${COLOR_NAMES[color]} ${thing.name}`}>
          <FigureView figure={thing} size={140} color={SHAPE_COLORS[color]} />
        </View>
      </GameStage>

      <AnswerRow style={{ maxWidth: columns * tile + (columns - 1) * rule.hair, alignSelf: 'center' }}>
        {shadows.map((shadow, i) => (
          <AnswerButton
            key={`${state.questionIndex}:${i}`}
            accessibilityLabel={spoken(shadow)}
            size={tile}
            state={state.ruledOut.includes(i) ? 'spent' : 'idle'}
            onPress={() => onChoose(i)}
          >
            <FigureView figure={shadow.figure} size={tile * 0.72} color={palette.ink} turn={shadow.turn} />
          </AnswerButton>
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
