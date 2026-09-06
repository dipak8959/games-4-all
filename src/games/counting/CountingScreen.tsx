import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GameFrame } from '../../components/GameFrame';
import { GradientSurface } from '../../components/GradientSurface';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { font, gradients, hitTarget, palette, radius, shadow, space } from '../../theme/tokens';
import { systemRng } from '../../util/random';
import { starsForMistakes, type GameScreenProps } from '../types';
import { answer, createGame, QUESTIONS_PER_ROUND, type CountingState } from './logic';

export function CountingScreen({ level, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  const [state, setState] = useState<CountingState>(() => createGame(systemRng, level));

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

  const restart = useCallback(() => setState(createGame(systemRng, level)), [level]);

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
    <GameFrame title="How Many?" icon="🔢" onExit={onExit} progress={progress}>
      <View style={styles.stageOuter}>
        <View style={styles.stageInner}>
          <View style={styles.objects} accessibilityLabel={`${state.question.count} objects to count`}>
            {Array.from({ length: state.question.count }, (_, i) => (
              <Text key={i} style={[styles.object, { fontSize: objectSize, lineHeight: objectSize * 1.2 }]}>
                {state.question.symbol}
              </Text>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.choices}>
        {state.question.choices.map((choice) => {
          const isRuledOut = state.ruledOut.includes(choice);
          return (
            <Pressable
              key={choice}
              accessibilityRole="button"
              accessibilityLabel={`${choice}`}
              accessibilityState={{ disabled: isRuledOut }}
              disabled={isRuledOut}
              onPress={() => onChoose(choice)}
              style={({ pressed }) => [
                styles.choiceOuter,
                pressed && !isRuledOut && styles.pressed,
                isRuledOut && styles.ruledOutOuter,
              ]}
            >
              {isRuledOut ? (
                <View style={[styles.choiceInner, styles.ruledOut]}>
                  <Text style={[styles.choiceText, styles.ruledOutText]}>{choice}</Text>
                </View>
              ) : (
                <GradientSurface colors={gradients.sun} style={styles.choiceInner}>
                  <Text style={styles.choiceText}>{choice}</Text>
                </GradientSurface>
              )}
            </Pressable>
          );
        })}
      </View>

      {state.complete ? (
        <RoundComplete
          stars={stars}
          reduceMotion={settings.reduceMotion}
          onPlayAgain={() => {
            onRoundComplete({ stars, level });
            restart();
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
  stageOuter: { flex: 1, borderRadius: radius.lg, marginBottom: space.md, ...shadow },
  stageInner: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: space.md,
    overflow: 'hidden',
  },
  objects: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.sm },
  object: { textAlign: 'center' },
  choices: { flexDirection: 'row', justifyContent: 'center', gap: space.md, paddingBottom: space.md },
  choiceOuter: { minWidth: hitTarget + 16, minHeight: hitTarget + 16, borderRadius: radius.lg, ...shadow },
  ruledOutOuter: { shadowOpacity: 0, elevation: 0 },
  choiceInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  choiceText: { fontSize: font.title + 8, fontWeight: '800', color: '#FFFFFF' },
  ruledOut: { backgroundColor: palette.surfaceAlt },
  ruledOutText: { color: palette.inkSoft },
  pressed: { transform: [{ scale: 0.95 }] },
});
