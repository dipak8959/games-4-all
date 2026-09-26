import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { StageLabel } from '../../components/GameStage';
import { GameFrame, useGamePaused } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge, tap } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { palette, playPalette, rule } from '../../theme/tokens';
import { systemRng } from '../../util/random';
import { nextLevel, type GameScreenProps } from '../types';
import {
  BALLS_PER_ROUND,
  BALL_RADIUS,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  PADDLE_HEIGHT,
  PADDLE_Y,
  createGame,
  movePaddle,
  serve,
  starsForWall,
  step,
  type BounceBricksState,
} from './logic';

/** Brick colours by row: decoration only — every brick breaks the same way,
 *  and a two-hit brick is told apart by its stripe, not its colour. */
const ROWS = [playPalette.berry, playPalette.sun, playPalette.leaf, playPalette.sky, playPalette.grape];

export function BounceBricksScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  // How to play is open: the ball stops where it is.
  const paused = useGamePaused();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<BounceBricksState>(() => createGame(systemRng, level));
  const [stage, setStage] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (state.resting || state.complete || paused) return undefined;
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
  }, [state.resting, state.complete, paused]);

  // A brick broken is a little "yes"; a ball lost, the gentle nudge.
  const seen = useRef({ bricks: state.bricks.length, balls: state.ballsLeft });
  useEffect(() => {
    if (state.bricks.length < seen.current.bricks) correct(settings);
    if (state.ballsLeft < seen.current.balls) nudge(settings);
    seen.current = { bricks: state.bricks.length, balls: state.ballsLeft };
  }, [state.bricks.length, state.ballsLeft, settings]);

  // The field keeps its shape, scaled to fit and centred in the stage.
  const k = Math.min(stage.width / FIELD_WIDTH, stage.height / FIELD_HEIGHT);
  const offsetX = (stage.width - FIELD_WIDTH * k) / 2;

  // The whole field is the control: the paddle follows the finger across
  // it, and touching it while the ball waits on the paddle serves.
  const follow = useCallback(
    (e: GestureResponderEvent) => {
      if (k <= 0) return;
      const x = (e.nativeEvent.locationX - offsetX) / k;
      setState((prev) => movePaddle(prev, x));
    },
    [k, offsetX],
  );
  const onGrant = useCallback(
    (e: GestureResponderEvent) => {
      follow(e);
      setState((prev) => {
        if (!prev.resting) return prev;
        tap(settings);
        return serve(prev, systemRng);
      });
    },
    [follow, settings],
  );

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    const fresh = createGame(systemRng, atLevel);
    seen.current = { bricks: fresh.bricks.length, balls: fresh.ballsLeft };
    setState(fresh);
  }, []);

  const stars = starsForWall(state);
  const progress = (state.total - state.bricks.length) / state.total;

  return (
    <GameFrame title="Bounce Bricks" icon="bricks" onExit={onExit} progress={progress}>
      <StageLabel live>{state.resting ? 'TAP TO SERVE, SLIDE TO MOVE' : 'KEEP THE BALL UP'}</StageLabel>

      <View
        style={styles.stage}
        onLayout={(e) => setStage({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={onGrant}
        onResponderMove={follow}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`Paddle. ${state.bricks.length} bricks left, ${state.ballsLeft} of ${BALLS_PER_ROUND} balls to go.`}
        testID="field"
      >
        {k > 0 ? (
          <View pointerEvents="none" style={[styles.field, { left: offsetX, width: FIELD_WIDTH * k, height: FIELD_HEIGHT * k }]}>
            {state.bricks.map((b) => {
              const row = Math.round((b.y - 50) / 22);
              return (
                <View
                  key={`${b.x}:${b.y}`}
                  testID="brick"
                  style={[styles.brick, { left: b.x * k, top: b.y * k, width: b.w * k, height: b.h * k, backgroundColor: ROWS[row % ROWS.length] }]}
                >
                  {b.hits > 1 ? <View style={[styles.stripe, { top: b.h * k * 0.4, height: Math.max(2, b.h * k * 0.2) }]} /> : null}
                </View>
              );
            })}

            <View
              testID="paddle"
              style={[
                styles.paddle,
                {
                  left: (state.paddleX - state.paddleW / 2) * k,
                  top: PADDLE_Y * k,
                  width: state.paddleW * k,
                  height: PADDLE_HEIGHT * k,
                },
              ]}
            />
            <View
              testID="ball"
              style={[
                styles.ball,
                {
                  left: (state.ball.x - BALL_RADIUS) * k,
                  top: (state.ball.y - BALL_RADIUS) * k,
                  width: BALL_RADIUS * 2 * k,
                  height: BALL_RADIUS * 2 * k,
                  borderRadius: BALL_RADIUS * k,
                },
              ]}
            />

            {/* Balls still to play, as dots under the paddle. */}
            <View style={[styles.balls, { top: (PADDLE_Y + 22) * k }]}>
              {Array.from({ length: state.ballsLeft }, (_, i) => (
                <View
                  key={i}
                  style={{ width: 10 * k, height: 10 * k, borderRadius: 5 * k, backgroundColor: palette.inkSoft }}
                />
              ))}
            </View>
          </View>
        ) : null}
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
  stage: { flex: 1, marginBottom: rule.major * 4 },
  field: {
    position: 'absolute',
    top: 0,
    backgroundColor: palette.surface,
    borderLeftWidth: rule.major,
    borderRightWidth: rule.major,
    borderTopWidth: rule.major,
    borderColor: palette.ink,
    overflow: 'hidden',
  },
  brick: { position: 'absolute' },
  stripe: { position: 'absolute', left: 0, right: 0, backgroundColor: palette.ink },
  paddle: { position: 'absolute', backgroundColor: palette.ink },
  ball: { position: 'absolute', backgroundColor: palette.accent },
  balls: { position: 'absolute', left: 8, flexDirection: 'row', gap: 6 },
});
