import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AnswerButton, AnswerRow, GameStage, StageLabel } from '../../components/GameStage';
import { GameFrame } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { palette, rule, space } from '../../theme/tokens';
import { systemRng } from '../../util/random';
import { Shape as ShapeMark } from '../shapes/Shape';
import { nextLevel, starsForMistakes, type GameScreenProps } from '../types';
import { SHOWN, STRINGS, choose, createGame, same, stringNow, type Bead, type BeadPatternState } from './logic';

const BEAD = 30;
const name = (b: Bead) => `${b.color === 'sun' ? 'yellow' : b.color === 'berry' ? 'red' : b.color === 'sky' ? 'blue' : b.color === 'leaf' ? 'green' : 'purple'} ${b.shape}`;

export function BeadPatternScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<BeadPatternState>(() => createGame(systemRng, level));

  const onChoose = useCallback(
    (choice: number) => {
      setState((prev) => {
        if (prev.complete || prev.ruledOut.includes(choice)) return prev;
        const str = stringNow(prev);
        if (same(str.choices[choice], str.beads[SHOWN + prev.threaded])) correct(settings);
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

  const str = stringNow(state);
  const on = SHOWN + state.threaded;
  const stars = starsForMistakes(state.mistakes);

  return (
    <GameFrame title="Bead Patterns" icon="beads" onExit={onExit} progress={state.index / STRINGS}>
      <StageLabel>{str.missing > 1 ? 'WHICH TWO BEADS COME NEXT?' : 'WHICH BEAD COMES NEXT?'}</StageLabel>
      <GameStage>
        <View
          style={styles.string}
          accessible
          accessibilityLabel={`${str.beads.slice(0, on).map(name).join(', ')}, then what?`}
          testID={`string:${str.beads.slice(0, on).map((b) => `${b.shape}.${b.color}`).join(',')}`}
        >
          <View style={styles.thread} />
          {str.beads.map((b, i) => (
            <View key={i} style={[styles.slot, i >= on && styles.bare]}>
              {i < on ? <ShapeMark shape={b.shape} color={b.color} size={BEAD} /> : null}
            </View>
          ))}
        </View>
      </GameStage>

      <AnswerRow>
        {str.choices.map((b, i) => (
          <AnswerButton
            key={`${state.index}:${state.threaded}:${i}`}
            accessibilityLabel={name(b)}
            state={state.ruledOut.includes(i) ? 'spent' : 'idle'}
            onPress={() => onChoose(i)}
          >
            <ShapeMark shape={b.shape} color={b.color} size={44} />
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

const styles = StyleSheet.create({
  string: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', rowGap: space.md },
  thread: { position: 'absolute', left: 0, right: 0, top: '50%', height: rule.major, backgroundColor: palette.inkSoft },
  slot: { width: BEAD + 6, height: BEAD + 6, alignItems: 'center', justifyContent: 'center' },
  bare: { borderWidth: rule.major, borderColor: palette.inkSoft, borderStyle: 'dashed', backgroundColor: palette.bg },
});
