import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GameFrame } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { font, hitTarget, palette, space } from '../../theme/tokens';
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
      <View style={styles.stageOuter}>
        <View style={styles.stageInner}>
          <Text style={styles.sum} accessibilityLabel={`${state.question.a} ${state.question.operator} ${state.question.b}`}>
            {state.question.a} {state.question.operator} {state.question.b}
          </Text>
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
              ]}
            >
              {isRuledOut ? (
                <View style={[styles.choiceInner, styles.ruledOut]}>
                  <Text style={[styles.choiceText, styles.ruledOutText]}>{choice}</Text>
                </View>
              ) : (
                <View style={[styles.choiceInner, { backgroundColor: palette.teal }]}>
                  <Text style={styles.choiceText}>{choice}</Text>
                </View>
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
  stageOuter: { flex: 1, marginBottom: space.md },
  stageInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: palette.surface,
    padding: space.md,
  },
  sum: { fontFamily: fonts.heavy, fontSize: font.playHero, color: palette.ink },
  choices: { flexDirection: 'row', justifyContent: 'center', gap: space.md, paddingBottom: space.md },
  choiceOuter: { minWidth: hitTarget + 16, minHeight: hitTarget + 16 },
  choiceInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  choiceText: { fontFamily: fonts.heavy, fontSize: font.playTitle + 8, color: '#FFFFFF' },
  ruledOut: { backgroundColor: palette.surfaceAlt },
  ruledOutText: { color: palette.inkSoft },
  pressed: { transform: [{ scale: 0.95 }] },
});
