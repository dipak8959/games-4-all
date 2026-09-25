import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AnswerButton, AnswerRow, StageLabel } from '../../components/GameStage';
import { GameFrame, useGamePaused } from '../../components/GameFrame';
import { Icon } from '../../components/Icon';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge, tap } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { hitTarget, palette, rule, space } from '../../theme/tokens';
import { systemRng } from '../../util/random';
import { nextLevel, starsForMistakes, type GameScreenProps } from '../types';
import { APPLES_PER_ROUND, createGame, step, turn, type Dir, type HungryWormState } from './logic';

const ARROWS: readonly { dir: Dir; turn: string }[] = [
  { dir: 'left', turn: '0deg' },
  { dir: 'up', turn: '90deg' },
  { dir: 'down', turn: '270deg' },
  { dir: 'right', turn: '180deg' },
];

export function HungryWormScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  // How to play is open: the worm waits where it is.
  const paused = useGamePaused();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<HungryWormState>(() => createGame(systemRng, level));
  const [area, setArea] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!state.started || state.complete || paused) return undefined;
    let frame = 0;
    let last: number | null = null;
    const loop = (now: number) => {
      const seconds = last == null ? 0 : (now - last) / 1000;
      last = now;
      setState((prev) => step(prev, seconds, systemRng));
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [state.started, state.complete, paused]);

  // An apple is a little "yes"; a bump, the gentle nudge.
  const seen = useRef({ eaten: 0, bumps: 0 });
  useEffect(() => {
    if (state.eaten > seen.current.eaten) correct(settings);
    if (state.bumps > seen.current.bumps) nudge(settings);
    seen.current = { eaten: state.eaten, bumps: state.bumps };
  }, [state.eaten, state.bumps, settings]);

  const onArrow = useCallback(
    (dir: Dir) => {
      tap(settings);
      setState((prev) => turn(prev, dir));
    },
    [settings],
  );

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    seen.current = { eaten: 0, bumps: 0 };
    setState(createGame(systemRng, atLevel));
  }, []);

  const cell = Math.floor(Math.min(area.width / state.cols, area.height / state.rows));
  const xOf = (c: number) => (c % state.cols) * cell;
  const yOf = (c: number) => Math.floor(c / state.cols) * cell;
  const head = state.worm[0];
  const eye = cell * 0.26;

  const label = !state.started
    ? 'PRESS AN ARROW TO GO'
    : state.stuck
      ? 'BUMP! PICK ANOTHER WAY'
      : 'GET THE APPLE';
  const stars = starsForMistakes(state.bumps);
  const progress = state.eaten / APPLES_PER_ROUND;

  return (
    <GameFrame title="Hungry Worm" icon="worm" onExit={onExit} progress={progress}>
      <StageLabel live>{label}</StageLabel>

      <View
        style={styles.area}
        onLayout={(e) => setArea({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
      >
        {cell > 0 ? (
          <View
            accessible
            accessibilityLabel={`Worm at row ${Math.floor(head / state.cols) + 1}, column ${(head % state.cols) + 1}, heading ${state.dir}. Apple at row ${Math.floor(state.apple / state.cols) + 1}, column ${(state.apple % state.cols) + 1}.`}
            testID={`worm:${state.cols}x${state.rows}`}
            style={[styles.board, { width: cell * state.cols, height: cell * state.rows }]}
          >
            {state.rocks.map((r) => (
              <View key={`r${r}`} testID={`rock:${r}`} style={[styles.rock, { left: xOf(r) + 1, top: yOf(r) + 1, width: cell - 2, height: cell - 2 }]} />
            ))}

            <View
              testID={`apple:${state.apple}`}
              style={{ position: 'absolute', left: xOf(state.apple), top: yOf(state.apple), width: cell, height: cell }}
            >
              <View
                style={[
                  styles.apple,
                  { left: cell * 0.14, top: cell * 0.2, width: cell * 0.72, height: cell * 0.72, borderRadius: cell * 0.36 },
                ]}
              />
              <View style={[styles.leaf, { left: cell * 0.5, top: cell * 0.04, width: cell * 0.26, height: cell * 0.16 }]} />
            </View>

            {state.worm.map((c, i) => (
              <View
                key={`w${i}`}
                testID={`seg:${c}`}
                style={[
                  i === 0 ? styles.head : i % 2 ? styles.body : styles.bodyStripe,
                  { left: xOf(c) + 1, top: yOf(c) + 1, width: cell - 2, height: cell - 2 },
                ]}
              >
                {i === 0
                  ? [0.14, 0.6].map((x) => (
                      <View
                        key={x}
                        style={[styles.eye, { left: (cell - 2) * x, top: (cell - 2) * 0.16, width: eye, height: eye, borderRadius: eye / 2 }]}
                      >
                        <View style={{ width: eye * 0.5, height: eye * 0.5, borderRadius: eye / 4, backgroundColor: palette.ink }} />
                      </View>
                    ))
                  : null}
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <AnswerRow style={styles.pad}>
        {ARROWS.map(({ dir, turn: rotate }) => (
          <AnswerButton key={dir} accessibilityLabel={`Go ${dir}`} size={hitTarget + 8} onPress={() => onArrow(dir)}>
            <View style={{ transform: [{ rotate }] }}>
              <Icon name="back" size={34} color={palette.ink} />
            </View>
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
  area: { flex: 1, alignItems: 'center', justifyContent: 'center', marginBottom: space.md },
  board: { backgroundColor: palette.surface, borderWidth: rule.major, borderColor: palette.ink },
  rock: { position: 'absolute', backgroundColor: palette.inkSoft },
  apple: { position: 'absolute', backgroundColor: palette.berry },
  leaf: { position: 'absolute', backgroundColor: palette.leaf },
  head: { position: 'absolute', backgroundColor: palette.accent },
  body: { position: 'absolute', backgroundColor: palette.leaf },
  bodyStripe: { position: 'absolute', backgroundColor: palette.teal },
  eye: { position: 'absolute', backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center' },
  pad: { paddingBottom: space.lg },
});
