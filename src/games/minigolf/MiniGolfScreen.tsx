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
  BALL,
  EDGE,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  HOLES_PER_ROUND,
  MAX_PULL,
  MIN_PULL,
  createGame,
  holeNow,
  puttFromPull,
  starsForRound,
  step,
  sweeperRect,
  type MiniGolfState,
  type Rect,
} from './logic';

type Pull = { readonly dx: number; readonly dy: number };

function Box({ r, k, style, testID }: { r: Rect; k: number; style: object; testID?: string }) {
  return <View testID={testID} style={[{ position: 'absolute', left: r.x * k, top: r.y * k, width: r.w * k, height: r.h * k }, style]} />;
}

export function MiniGolfScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  // How to play is open: the ball and the sweeper stop where they are.
  const paused = useGamePaused();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<MiniGolfState>(() => createGame(systemRng, level));
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const [pull, setPull] = useState<Pull | null>(null);
  const anchor = useRef<{ x: number; y: number } | null>(null);

  const hole = holeNow(state);
  // The sweeper moves all the time; everything else only while rolling.
  const moving = state.phase !== 'aiming' || hole.sweeper != null;
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

  // In the cup is the cheer; a splash, the gentle nudge.
  const heard = useRef('');
  useEffect(() => {
    const key = `${state.index}:${state.phase}`;
    if (key === heard.current) return;
    heard.current = key;
    if (state.phase === 'holed' && !state.pickedUp) correct(settings);
    if (state.phase === 'splash') nudge(settings);
  }, [state.index, state.phase, state.pickedUp, settings]);

  const k = Math.min(stage.width / FIELD_WIDTH, stage.height / FIELD_HEIGHT);
  const offsetX = (stage.width - FIELD_WIDTH * k) / 2;

  const onGrant = useCallback((e: GestureResponderEvent) => {
    anchor.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
    setPull({ dx: 0, dy: 0 });
  }, []);
  const onMove = useCallback(
    (e: GestureResponderEvent) => {
      if (!anchor.current || k <= 0) return;
      const dx = (e.nativeEvent.pageX - anchor.current.x) / k;
      const dy = (e.nativeEvent.pageY - anchor.current.y) / k;
      const len = Math.hypot(dx, dy);
      const scale = len > MAX_PULL ? MAX_PULL / len : 1;
      setPull({ dx: dx * scale, dy: dy * scale });
    },
    [k],
  );
  const onRelease = useCallback(() => {
    const p = pull;
    anchor.current = null;
    setPull(null);
    if (!p) return;
    setState((prev) => {
      const next = puttFromPull(prev, p.dx, p.dy);
      if (next !== prev) tap(settings);
      return next;
    });
  }, [pull, settings]);
  const onTerminate = useCallback(() => {
    anchor.current = null;
    setPull(null);
  }, []);

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    heard.current = '';
    setState(createGame(systemRng, atLevel));
  }, []);

  const putts = state.putts[state.index] ?? 0;
  const aiming = state.phase === 'aiming' && pull && Math.hypot(pull.dx, pull.dy) >= MIN_PULL;
  const power = pull ? Math.min(1, Math.hypot(pull.dx, pull.dy) / MAX_PULL) : 0;
  const label =
    state.phase === 'holed'
      ? state.pickedUp
        ? 'PICKED UP — ON TO THE NEXT HOLE'
        : 'IN THE HOLE!'
      : state.phase === 'splash'
        ? 'SPLASH! BACK YOU GO'
        : state.phase === 'rolling'
          ? `HOLE ${state.index + 1} OF ${HOLES_PER_ROUND} · PAR ${hole.par}`
          : aiming
            ? 'LET GO TO PUTT'
            : `HOLE ${state.index + 1} · PAR ${hole.par} · PULL BACK, LET GO`;

  const stars = starsForRound(state);
  const progress = (state.index + (state.phase === 'holed' ? 1 : 0)) / HOLES_PER_ROUND;
  const ball = state.ball;
  const toCup = Math.hypot(hole.cup.x - ball.x, hole.cup.y - ball.y);
  const cupWay =
    Math.abs(hole.cup.x - ball.x) < 20 ? 'straight up' : `up and to the ${hole.cup.x < ball.x ? 'left' : 'right'}`;

  return (
    <GameFrame title="Mini Golf" icon="golf" onExit={onExit} progress={progress}>
      <StageLabel live>{label}</StageLabel>

      <View
        style={styles.stage}
        onLayout={(e) => setStage({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
        onStartShouldSetResponder={() => state.phase === 'aiming' && !state.complete}
        onMoveShouldSetResponder={() => state.phase === 'aiming' && !state.complete}
        onResponderGrant={onGrant}
        onResponderMove={onMove}
        onResponderRelease={onRelease}
        onResponderTerminate={onTerminate}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`Hole ${state.index + 1} of ${HOLES_PER_ROUND}, par ${hole.par}, putt ${putts + 1}. The cup is ${cupWay}, ${
          toCup < 60 ? 'close' : toCup < 200 ? 'a way off' : 'far'
        }. Pull back from the ball and let go to putt.`}
        testID={`green:${state.index}:${state.phase}`}
      >
        {k > 0 ? (
          <View testID="course" pointerEvents="none" style={[styles.field, { left: offsetX, width: FIELD_WIDTH * k, height: FIELD_HEIGHT * k }]}>
            <View style={[styles.green, { left: EDGE * k, top: EDGE * k, right: EDGE * k, bottom: EDGE * k }]} />
            {hole.water.map((w, i) => (
              <Box key={`w${i}`} testID="water" r={w} k={k} style={styles.water} />
            ))}
            {hole.water.map((w, i) =>
              [0.3, 0.6].map((at) => (
                <View
                  key={`r${i}${at}`}
                  style={[styles.ripple, { left: (w.x + 8) * k, top: (w.y + w.h * at) * k, width: Math.max(0, w.w - 16) * k, height: 2 * k }]}
                />
              )),
            )}
            {hole.walls.map((w, i) => (
              <Box key={`b${i}`} testID="wall" r={w} k={k} style={styles.wall} />
            ))}
            {hole.sweeper ? <Box testID="sweeper" r={sweeperRect(hole.sweeper, state.time)} k={k} style={styles.sweeper} /> : null}
            {/* The tee, the cup, and its flag. */}
            <View style={[styles.tee, { left: (hole.tee.x - 10) * k, top: (hole.tee.y - 3) * k, width: 20 * k, height: 6 * k }]} />
            <View
              testID="cup"
              style={[
                styles.cup,
                { left: (hole.cup.x - state.cup) * k, top: (hole.cup.y - state.cup) * k, width: state.cup * 2 * k, height: state.cup * 2 * k, borderRadius: state.cup * k },
              ]}
            />
            <View style={[styles.pole, { left: hole.cup.x * k, top: (hole.cup.y - 44) * k, width: 3 * k, height: 44 * k }]} />
            <View style={[styles.flag, { left: (hole.cup.x + 3) * k, top: (hole.cup.y - 44) * k, width: 22 * k, height: 14 * k }]} />
            {/* The aim: dots the way the ball will go, more for a harder putt. */}
            {aiming && pull
              ? Array.from({ length: Math.max(2, Math.round(power * 9)) }, (_, i) => {
                  const len = Math.hypot(pull.dx, pull.dy);
                  const ux = -pull.dx / len;
                  const uy = -pull.dy / len;
                  const at = BALL + 12 + i * 14;
                  return (
                    <View
                      key={i}
                      style={[styles.dot, { left: (ball.x + ux * at - 3) * k, top: (ball.y + uy * at - 3) * k, width: 6 * k, height: 6 * k, borderRadius: 3 * k }]}
                    />
                  );
                })
              : null}
            {state.phase !== 'holed' || state.pickedUp ? (
              <View
                testID="ball"
                style={[
                  styles.ball,
                  { left: (ball.x - BALL) * k, top: (ball.y - BALL) * k, width: BALL * 2 * k, height: BALL * 2 * k, borderRadius: BALL * k },
                ]}
              />
            ) : null}
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
    backgroundColor: palette.bg,
    borderWidth: rule.major,
    borderColor: palette.ink,
    overflow: 'hidden',
  },
  green: { position: 'absolute', backgroundColor: playPalette.leaf },
  water: { backgroundColor: playPalette.sky, borderWidth: rule.hair, borderColor: palette.ink },
  ripple: { position: 'absolute', backgroundColor: palette.bg },
  wall: { backgroundColor: palette.bg, borderWidth: rule.major, borderColor: palette.ink },
  sweeper: { backgroundColor: palette.accent, borderWidth: rule.major, borderColor: palette.ink },
  tee: { position: 'absolute', backgroundColor: palette.bg, borderWidth: rule.hair, borderColor: palette.ink },
  cup: { position: 'absolute', backgroundColor: palette.ink },
  pole: { position: 'absolute', backgroundColor: palette.ink },
  flag: { position: 'absolute', backgroundColor: playPalette.sun, borderWidth: rule.hair, borderColor: palette.ink },
  dot: { position: 'absolute', backgroundColor: palette.bg, borderWidth: rule.hair, borderColor: palette.ink },
  ball: { position: 'absolute', backgroundColor: palette.bg, borderWidth: rule.major, borderColor: palette.ink },
});
