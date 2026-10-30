import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { StageLabel } from '../../components/GameStage';
import { GameFrame, useGamePaused } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge, tap } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { palette, rule } from '../../theme/tokens';
import { systemRng } from '../../util/random';
import { nextLevel, type GameScreenProps } from '../types';
import {
  BALL_RADIUS,
  BOARD_WIDTH,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  GROUND_Y,
  HAND,
  RIM_EDGE,
  THROWS_PER_ROUND,
  aim,
  board,
  cancelAim,
  createGame,
  guideDots,
  hoopNow,
  release,
  rimEdges,
  starsForThrows,
  step,
  type HoopShotState,
} from './logic';

/** How far the ball moves back with the pull, so pulling looks like pulling. */
const DRAW_BACK = 0.25;
const NET_DROP = 32;
/** Half the wind flag's height. */
const FLAG_HALF = 10;

export function HoopShotScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  // How to play is open: the ball hangs where it is, and the hoop holds still.
  const paused = useGamePaused();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<HoopShotState>(() => createGame(systemRng, level));
  const [stage, setStage] = useState({ width: 0, height: 0 });

  // The clock only runs when something is moving: a ball in the air, the
  // pause after it lands, or a hoop that sways.
  const moving = state.phase !== 'ready' || state.sway > 0;
  useEffect(() => {
    if (!moving || state.complete || paused) return undefined;
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
  }, [moving, state.complete, paused]);

  // In the hoop is a little cheer; a miss, the gentle nudge. Once a throw.
  const heard = useRef(-1);
  useEffect(() => {
    if (state.phase !== 'landed' || heard.current === state.throwIndex) return;
    heard.current = state.throwIndex;
    if (state.scored) correct(settings);
    else nudge(settings);
  }, [state.phase, state.throwIndex, state.scored, settings]);

  // The field keeps its shape, scaled to fit and centred in the stage.
  const k = Math.min(stage.width / FIELD_WIDTH, stage.height / FIELD_HEIGHT);
  const offsetX = (stage.width - FIELD_WIDTH * k) / 2;

  // Touch anywhere and pull back: the throw goes the other way, as hard as
  // the pull is long. Let go to throw.
  const anchor = useRef<{ x: number; y: number } | null>(null);
  const onGrant = useCallback((e: GestureResponderEvent) => {
    anchor.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
  }, []);
  const onMove = useCallback(
    (e: GestureResponderEvent) => {
      if (!anchor.current || k <= 0) return;
      const dx = (anchor.current.x - e.nativeEvent.pageX) / k;
      const dy = (anchor.current.y - e.nativeEvent.pageY) / k;
      setState((prev) => aim(prev, dx, dy));
    },
    [k],
  );
  const onRelease = useCallback(() => {
    anchor.current = null;
    setState((prev) => {
      const thrown = release(prev);
      if (thrown !== prev) tap(settings);
      return thrown;
    });
  }, [settings]);
  const onTerminate = useCallback(() => {
    anchor.current = null;
    setState((prev) => cancelAim(prev));
  }, []);

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    heard.current = -1;
    setState(createGame(systemRng, atLevel));
  }, []);

  const hoop = hoopNow(state);
  const edges = rimEdges(state, hoop);
  const b = board(state, hoop);
  const dots = guideDots(state);
  const ball =
    state.phase === 'ready'
      ? {
          x: HAND.x - (state.pull?.dx ?? 0) * DRAW_BACK,
          y: HAND.y - (state.pull?.dy ?? 0) * DRAW_BACK,
        }
      : state.ball;
  const toGo = THROWS_PER_ROUND - state.throwIndex - (state.phase === 'ready' ? 0 : 1);

  // The wind, as a flag: which way it points is which way it blows, and the
  // longer it is the harder. No flag, no wind.
  const maxWind = Math.max(1, ...state.hoops.map((h) => Math.abs(h.wind)));
  const flag = hoop.wind ? 18 + 30 * (Math.abs(hoop.wind) / maxWind) : 0;
  const windWords = !hoop.wind
    ? ''
    : ` Wind blowing ${hoop.wind > 0 ? 'right, towards the hoop' : 'left, away from the hoop'}, ${
        Math.abs(hoop.wind) > maxWind * 0.7 ? 'strong' : 'gentle'
      }.`;

  const label =
    state.phase === 'landed'
      ? state.scored
        ? 'IN THE HOOP!'
        : 'NOT THIS TIME'
      : state.phase === 'flying'
        ? 'THERE IT GOES'
        : state.pull
          ? 'LET GO TO THROW'
          : hoop.wind
            ? 'MIND THE WIND — PULL BACK TO THROW'
            : 'PULL BACK FROM THE BALL, LET GO';
  const stars = starsForThrows(state);
  const progress = (state.throwIndex + (state.phase === 'ready' ? 0 : 1)) / THROWS_PER_ROUND;

  return (
    <GameFrame title="Hoop Shot" icon="hoop" onExit={onExit} progress={progress}>
      <StageLabel live>{label}</StageLabel>

      <View
        style={styles.stage}
        onLayout={(e) => setStage({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={onGrant}
        onResponderMove={onMove}
        onResponderRelease={onRelease}
        onResponderTerminate={onTerminate}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`Ball and hoop. Pull back from the ball and let go to throw. Throw ${Math.min(
          THROWS_PER_ROUND,
          state.throwIndex + 1,
        )} of ${THROWS_PER_ROUND}.${windWords}`}
        testID="court"
      >
        {k > 0 ? (
          <View pointerEvents="none" style={[styles.field, { left: offsetX, width: FIELD_WIDTH * k, height: FIELD_HEIGHT * k }]}>
            {flag ? (
              <View testID={`wind:${hoop.wind > 0 ? 'right' : 'left'}`} style={[styles.windAt, { left: 20 * k, top: 24 * k }]}>
                <View style={[styles.pole, { height: 64 * k }]} />
                <View
                  style={[
                    styles.flag,
                    {
                      top: 2 * k,
                      left: hoop.wind > 0 ? rule.major : -flag * k,
                      borderTopWidth: FLAG_HALF * k,
                      borderBottomWidth: FLAG_HALF * k,
                      borderLeftWidth: hoop.wind > 0 ? flag * k : 0,
                      borderRightWidth: hoop.wind > 0 ? 0 : flag * k,
                    },
                  ]}
                />
              </View>
            ) : null}

            {/* The post, the board, and the rim seen side-on, with its net. */}
            <View style={[styles.post, { left: (b.x + 1) * k, top: b.bottom * k, width: (BOARD_WIDTH - 2) * k, height: (GROUND_Y - b.bottom) * k }]} />
            <View style={[styles.board, { left: b.x * k, top: b.top * k, width: BOARD_WIDTH * k, height: (b.bottom - b.top) * k }]} />
            {[0, 1, 2, 3].map((i) => {
              const x = edges.left + ((edges.right - edges.left) * (i + 0.5)) / 4;
              return <View key={`n${i}`} style={[styles.net, { left: x * k, top: edges.y * k, height: NET_DROP * k }]} />;
            })}
            {[0.45, 0.9].map((d) => (
              <View
                key={`m${d}`}
                style={[styles.mesh, { left: edges.left * k, top: (edges.y + NET_DROP * d) * k, width: (edges.right - edges.left) * k }]}
              />
            ))}
            <View
              testID="hoop"
              style={[
                styles.rim,
                {
                  left: (edges.left - RIM_EDGE) * k,
                  top: (edges.y - RIM_EDGE / 2) * k,
                  width: (edges.right - edges.left + RIM_EDGE * 2) * k,
                  height: RIM_EDGE * k,
                },
              ]}
            />
            {[edges.left, edges.right].map((x) => (
              <View
                key={`e${x}`}
                style={[styles.edge, { left: (x - RIM_EDGE) * k, top: (edges.y - RIM_EDGE) * k, width: RIM_EDGE * 2 * k, height: RIM_EDGE * 2 * k }]}
              />
            ))}

            {/* The ground, and the block the ball waits on. */}
            <View style={[styles.ground, { top: GROUND_Y * k, height: (FIELD_HEIGHT - GROUND_Y) * k }]} />
            <View
              style={[
                styles.tee,
                { left: (HAND.x - 12) * k, top: (HAND.y + BALL_RADIUS) * k, width: 24 * k, height: (GROUND_Y - HAND.y - BALL_RADIUS) * k },
              ]}
            />

            {dots.map((d, i) => (
              <View key={`d${i}`} testID="dot" style={[styles.dot, { left: d.x * k - 2, top: d.y * k - 2 }]} />
            ))}

            <View
              testID="ball"
              style={[
                styles.ball,
                {
                  left: (ball.x - BALL_RADIUS) * k,
                  top: (ball.y - BALL_RADIUS) * k,
                  width: BALL_RADIUS * 2 * k,
                  height: BALL_RADIUS * 2 * k,
                  borderRadius: BALL_RADIUS * k,
                },
              ]}
            >
              <View style={[styles.seam, { top: (BALL_RADIUS - 1) * k }]} />
            </View>

            {/* Throws still to come, as squares along the ground. */}
            <View style={[styles.throws, { top: (GROUND_Y + 14) * k }]}>
              {Array.from({ length: Math.max(0, toGo) }, (_, i) => (
                <View key={i} style={{ width: 10 * k, height: 10 * k, backgroundColor: palette.bg }} />
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
    borderWidth: rule.major,
    borderColor: palette.ink,
    overflow: 'hidden',
  },
  windAt: { position: 'absolute' },
  pole: { width: rule.major, backgroundColor: palette.ink },
  flag: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: palette.ink,
    borderRightColor: palette.ink,
  },
  post: { position: 'absolute', backgroundColor: palette.inkSoft },
  board: { position: 'absolute', backgroundColor: palette.ink },
  rim: { position: 'absolute', backgroundColor: palette.ink },
  edge: { position: 'absolute', backgroundColor: palette.ink },
  net: { position: 'absolute', width: rule.hair, backgroundColor: palette.inkSoft },
  mesh: { position: 'absolute', height: rule.hair, backgroundColor: palette.inkSoft },
  ground: { position: 'absolute', left: 0, right: 0, backgroundColor: palette.ink },
  tee: { position: 'absolute', backgroundColor: palette.inkSoft },
  dot: { position: 'absolute', width: 4, height: 4, backgroundColor: palette.ink },
  ball: { position: 'absolute', backgroundColor: palette.accent, justifyContent: 'center', overflow: 'hidden' },
  seam: { position: 'absolute', left: 0, right: 0, height: rule.major, backgroundColor: palette.ink },
  throws: { position: 'absolute', left: 8, flexDirection: 'row', gap: 6 },
});
