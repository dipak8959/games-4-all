import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { StageLabel } from '../../components/GameStage';
import { GameFrame, useGamePaused } from '../../components/GameFrame';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { palette, rule } from '../../theme/tokens';
import { systemRng } from '../../util/random';
import { Shape as ShapeMark } from '../shapes/Shape';
import { nextLevel, type GameScreenProps } from '../types';
import {
  BAR,
  BOARDS,
  EDGE,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  GOAL,
  HOLE,
  MARBLE,
  REST,
  boardNow,
  createGame,
  press,
  starsForDrops,
  step,
  totalDrops,
  type MarbleMazeState,
} from './logic';

/** The dent a finger makes where it holds the board down. */
const DENT = 14;

export function MarbleMazeScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  // How to play is open: the board holds level and still.
  const paused = useGamePaused();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<MarbleMazeState>(() => createGame(systemRng, level));
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (state.complete || paused) return undefined;
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
  }, [state.complete, paused]);

  // Home is a cheer; down a hole, the gentle nudge.
  const heard = useRef('');
  useEffect(() => {
    const key = `${state.index}:${state.phase}:${totalDrops(state)}`;
    if (key === heard.current) return;
    heard.current = key;
    if (state.phase === 'home' && !state.lifted) correct(settings);
    if (state.phase === 'dropped') nudge(settings);
  }, [state, settings]);

  const k = Math.min(stage.width / FIELD_WIDTH, stage.height / FIELD_HEIGHT);
  const offsetX = (stage.width - FIELD_WIDTH * k) / 2;

  // The whole board is the control: hold it down where the marble should
  // roll, slide to steer, let go to level it out.
  const hold = useCallback(
    (e: GestureResponderEvent) => {
      if (k <= 0) return;
      const at = { x: (e.nativeEvent.locationX - offsetX) / k, y: e.nativeEvent.locationY / k };
      setTouched(true);
      setState((prev) => press(prev, at));
    },
    [k, offsetX],
  );
  const letGo = useCallback(() => setState((prev) => press(prev, null)), []);

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    heard.current = '';
    setState(createGame(systemRng, atLevel));
  }, []);

  const board = boardNow(state);
  const m = state.marble;
  const label = state.complete
    ? 'EVERY BOARD DONE!'
    : state.phase === 'home'
      ? state.lifted
        ? 'LIFTED TO THE FINISH'
        : 'HOME!'
      : state.phase === 'dropped'
        ? 'DOWN A HOLE — BACK TO THE LAST DOOR'
        : !touched
          ? 'HOLD THE BOARD WHERE THE MARBLE SHOULD ROLL'
          : `BOARD ${state.index + 1} OF ${BOARDS} · UP TO THE STAR`;
  const stars = starsForDrops(totalDrops(state));
  const progress = (state.index + (state.phase === 'home' ? 1 : 0)) / BOARDS;
  // Dropping, the marble shrinks away down the hole.
  const size = state.phase === 'dropped' ? MARBLE * Math.max(0.25, 1 - state.clock / REST) : MARBLE;
  const doorsLeft = board.bars.filter((b) => m.y > b.y);
  const nextDoor = doorsLeft[0];
  const way = nextDoor ? (Math.abs(nextDoor.door - m.x) < 20 ? 'straight up' : `up and to the ${nextDoor.door < m.x ? 'left' : 'right'}`) : 'up to the star';

  return (
    <GameFrame title="Marble Maze" icon="marble" onExit={onExit} progress={progress}>
      <StageLabel live>{label}</StageLabel>

      <View
        style={styles.stage}
        onLayout={(e) => setStage({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
        onStartShouldSetResponder={() => !state.complete}
        onMoveShouldSetResponder={() => !state.complete}
        onResponderGrant={hold}
        onResponderMove={hold}
        onResponderRelease={letGo}
        onResponderTerminate={letGo}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`Board ${state.index + 1} of ${BOARDS}. ${doorsLeft.length} ${doorsLeft.length === 1 ? 'wall' : 'walls'} to go; the way on is ${way}. Hold the board where the marble should roll.`}
        testID={`board:${state.index}:${state.phase}`}
      >
        {k > 0 ? (
          <View testID="field" pointerEvents="none" style={[styles.field, { left: offsetX, width: FIELD_WIDTH * k, height: FIELD_HEIGHT * k }]}>
            <View style={[styles.rim, { borderWidth: EDGE * k }]} />
            {board.bars.map((b) => (
              <View key={b.y} testID={`bar:${b.door}:${b.y}:${b.width}`}>
                <View style={[styles.bar, { left: EDGE * k, top: (b.y - BAR / 2) * k, width: (b.door - b.width / 2 - EDGE) * k, height: BAR * k }]} />
                <View
                  style={[
                    styles.bar,
                    { left: (b.door + b.width / 2) * k, top: (b.y - BAR / 2) * k, width: (FIELD_WIDTH - EDGE - b.door - b.width / 2) * k, height: BAR * k },
                  ]}
                />
              </View>
            ))}
            {board.holes.map((h) => (
              <View
                key={`${h.x}:${h.y}`}
                testID={`hole:${h.x.toFixed(1)}:${h.y.toFixed(1)}`}
                style={[styles.hole, { left: (h.x - HOLE) * k, top: (h.y - HOLE) * k, width: HOLE * 2 * k, height: HOLE * 2 * k, borderRadius: HOLE * k }]}
              />
            ))}
            {/* The finish: a ring with a star in it. */}
            <View
              testID={`goal:${board.goal.x}:${board.goal.y}`}
              style={[
                styles.goal,
                { left: (board.goal.x - GOAL) * k, top: (board.goal.y - GOAL) * k, width: GOAL * 2 * k, height: GOAL * 2 * k, borderRadius: GOAL * k },
              ]}
            >
              <ShapeMark shape="star" color="sun" size={GOAL * 1.1 * k} />
            </View>
            {state.finger && state.phase === 'rolling' ? (
              <View
                style={[
                  styles.dent,
                  { left: (state.finger.x - DENT) * k, top: (state.finger.y - DENT) * k, width: DENT * 2 * k, height: DENT * 2 * k, borderRadius: DENT * k },
                ]}
              />
            ) : null}
            <View
              testID={`marble:${m.x.toFixed(1)}:${m.y.toFixed(1)}:${m.vx.toFixed(1)}:${m.vy.toFixed(1)}`}
              style={[styles.marble, { left: (m.x - size) * k, top: (m.y - size) * k, width: size * 2 * k, height: size * 2 * k, borderRadius: size * k }]}
            >
              {/* The shine. */}
              <View style={[styles.shine, { left: size * 0.45 * k, top: size * 0.4 * k, width: size * 0.5 * k, height: size * 0.5 * k, borderRadius: size * 0.25 * k }]} />
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
            setTouched(false);
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
  field: { position: 'absolute', top: 0, backgroundColor: palette.surface, overflow: 'hidden' },
  rim: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, borderColor: palette.ink },
  bar: { position: 'absolute', backgroundColor: palette.ink },
  hole: { position: 'absolute', backgroundColor: palette.ink, borderWidth: rule.major, borderColor: palette.inkSoft },
  goal: { position: 'absolute', alignItems: 'center', justifyContent: 'center', backgroundColor: palette.bg, borderWidth: rule.major, borderColor: palette.ink },
  dent: { position: 'absolute', borderWidth: rule.major, borderColor: palette.inkSoft },
  marble: { position: 'absolute', backgroundColor: palette.accent, borderWidth: rule.major, borderColor: palette.ink },
  shine: { position: 'absolute', backgroundColor: palette.bg },
});
