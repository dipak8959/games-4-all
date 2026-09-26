import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { StageLabel } from '../../components/GameStage';
import { GameFrame, useGamePaused } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge, tap } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { palette, playPalette, rule } from '../../theme/tokens';
import { nextLevel, type GameScreenProps } from '../types';
import {
  BASE_Y,
  BLOCKS_PER_ROUND,
  BLOCK_HEIGHT,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  createGame,
  drop,
  start,
  starsForTower,
  step,
  top,
  type TallTowerState,
} from './logic';

/**
 * react-native-web's own name for "report a press the instant it starts".
 * A drop is all about timing; the web build otherwise waits 50ms.
 */
const PRESS_AT_ONCE = { delayPressIn: 0 } as object;

/** The tower's blocks, bottom up. Decoration only: every block is the same. */
const LAYERS = [playPalette.sky, playPalette.leaf, playPalette.sun, playPalette.grape, playPalette.teal, playPalette.berry];
const GRAVITY = 900;

export function TallTowerScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  // How to play is open: the block stops where it is.
  const paused = useGamePaused();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<TallTowerState>(() => createGame(level));
  const [stage, setStage] = useState({ width: 0, height: 0 });

  const moving = state.started && (!state.complete || state.falling.length > 0);
  useEffect(() => {
    if (!moving || paused) return undefined;
    let frame = 0;
    let last: number | null = null;
    const loop = (now: number) => {
      const seconds = last == null ? 0 : (now - last) / 1000;
      last = now;
      setState((prev) => step(prev, seconds));
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [moving, paused]);

  // Square is a little cheer; a trim, a tap; a miss, the gentle nudge.
  const seen = useRef({ drops: 0, square: 0, misses: 0 });
  useEffect(() => {
    const was = seen.current;
    if (state.drops > was.drops) {
      if (state.square > was.square) correct(settings);
      else if (state.misses > was.misses) nudge(settings);
      else tap(settings);
    }
    seen.current = { drops: state.drops, square: state.square, misses: state.misses };
  }, [state.drops, state.square, state.misses, settings]);

  const onPress = useCallback(() => {
    if (paused) return;
    setState((prev) => (prev.started ? drop(prev) : start(prev)));
  }, [paused]);

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    seen.current = { drops: 0, square: 0, misses: 0 };
    setState(createGame(atLevel));
  }, []);

  const k = Math.min(stage.width / FIELD_WIDTH, stage.height / FIELD_HEIGHT);
  const offsetX = (stage.width - FIELD_WIDTH * k) / 2;
  const rowY = (row: number) => BASE_Y - row * BLOCK_HEIGHT;
  const aim = top(state);
  const nextRow = state.tower.length;

  const label = !state.started
    ? 'TAP TO START'
    : state.ghost
      ? 'TAP WHEN IT IS OVER THE OUTLINE'
      : 'TAP TO DROP IT ON THE TOWER';
  const stars = starsForTower(state);
  const progress = state.drops / BLOCKS_PER_ROUND;

  return (
    <GameFrame title="Tall Tower" icon="tower" onExit={onExit} progress={progress}>
      <StageLabel live>{label}</StageLabel>

      {/* The whole stage is the button: tap anywhere to drop. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          state.started
            ? `Drop the block. ${state.drops} of ${BLOCKS_PER_ROUND} dropped, the tower is ${state.tower.length - 1} high.`
            : 'Start the block sliding'
        }
        {...PRESS_AT_ONCE}
        onPressIn={onPress}
        onLayout={(e) => setStage({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
        style={styles.stage}
        testID="tower-stage"
      >
        {k > 0 ? (
          <View pointerEvents="none" style={[styles.field, { left: offsetX, width: FIELD_WIDTH * k, height: FIELD_HEIGHT * k }]}>
            {state.tower.map((b, i) => (
              <View
                key={`t${i}`}
                testID={i === state.tower.length - 1 ? `top:${Math.round(b.x)}:${Math.round(b.w)}` : undefined}
                style={[
                  styles.block,
                  {
                    left: b.x * k,
                    top: rowY(i) * k + rule.hair,
                    width: b.w * k,
                    height: BLOCK_HEIGHT * k - rule.hair,
                    backgroundColor: i === 0 ? palette.ink : LAYERS[(i - 1) % LAYERS.length],
                  },
                ]}
              />
            ))}

            {/* Where square would be, at the gentlest levels. */}
            {state.ghost && !state.complete ? (
              <View
                style={[
                  styles.ghost,
                  { left: aim.x * k, top: rowY(nextRow) * k, width: aim.w * k, height: BLOCK_HEIGHT * k },
                ]}
              />
            ) : null}

            {/* Trimmed pieces and missed blocks falling away — decoration, so
                with reduce motion they simply go. */}
            {settings.reduceMotion
              ? null
              : state.falling.map((f, i) => (
                  <View
                    key={`f${i}:${f.row}:${f.x}`}
                    style={[
                      styles.block,
                      {
                        left: f.x * k,
                        top: (rowY(f.row) + 0.5 * GRAVITY * f.age * f.age) * k,
                        width: f.w * k,
                        height: BLOCK_HEIGHT * k - rule.hair,
                        backgroundColor: palette.inkSoft,
                      },
                    ]}
                  />
                ))}

            {!state.complete ? (
              <View
                testID="slider"
                style={[
                  styles.block,
                  {
                    left: state.slider.x * k,
                    top: rowY(nextRow) * k + rule.hair,
                    width: state.slider.w * k,
                    height: BLOCK_HEIGHT * k - rule.hair,
                    backgroundColor: palette.accent,
                  },
                ]}
              />
            ) : null}
          </View>
        ) : null}
      </Pressable>

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
  stage: { flex: 1, marginBottom: rule.major * 4 },
  field: {
    position: 'absolute',
    top: 0,
    backgroundColor: palette.surface,
    borderWidth: rule.major,
    borderColor: palette.ink,
    overflow: 'hidden',
  },
  block: { position: 'absolute' },
  ghost: { position: 'absolute', borderWidth: rule.hair, borderColor: palette.ink },
});
