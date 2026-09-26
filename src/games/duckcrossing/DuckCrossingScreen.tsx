import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AnswerButton, AnswerRow, StageLabel } from '../../components/GameStage';
import { GameFrame, useGamePaused } from '../../components/GameFrame';
import { Icon } from '../../components/Icon';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge, tap } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { hitTarget, palette, playPalette, rule, space } from '../../theme/tokens';
import { systemRng } from '../../util/random';
import { nextLevel, starsForMistakes, type GameScreenProps } from '../types';
import {
  COLS,
  DUCKS_PER_ROUND,
  clearAt,
  createGame,
  hop,
  step,
  vehiclesAt,
  type DuckCrossingState,
  type Hop,
} from './logic';

const ARROWS: readonly { way: Hop; turn: string }[] = [
  { way: 'left', turn: '0deg' },
  { way: 'up', turn: '90deg' },
  { way: 'down', turn: '270deg' },
  { way: 'right', turn: '180deg' },
];

/** Vehicle colours by lane: decoration only. */
const PAINT = [playPalette.berry, playPalette.grape, playPalette.teal, playPalette.sky, playPalette.deep];

/** The duckling from above: a round yellow body, a beak pointing the way
 *  it's going, two eyes. */
function Duckling({ size, bumped }: { readonly size: number; readonly bumped: boolean }) {
  const body = size * 0.62;
  const eye = Math.max(3, size * 0.1);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: 0,
          height: 0,
          marginBottom: -size * 0.04,
          borderLeftWidth: size * 0.1,
          borderRightWidth: size * 0.1,
          borderBottomWidth: size * 0.16,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: palette.accent,
        }}
      />
      <View style={[styles.body, { width: body, height: body, borderRadius: body / 2 }]}>
        {[-1, 1].map((side) => (
          <View
            key={side}
            style={{
              position: 'absolute',
              top: body * 0.18,
              left: body / 2 + side * body * 0.2 - eye / 2,
              width: eye,
              height: bumped ? Math.max(2, eye * 0.3) : eye,
              borderRadius: bumped ? 0 : eye / 2,
              backgroundColor: palette.ink,
            }}
          />
        ))}
      </View>
    </View>
  );
}

export function DuckCrossingScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  // How to play is open: the traffic stops where it is.
  const paused = useGamePaused();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<DuckCrossingState>(() => createGame(systemRng, level));
  const [area, setArea] = useState({ width: 0, height: 0 });

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

  // Home is a little cheer; a bump, the gentle nudge.
  const seen = useRef({ home: 0, bumps: 0 });
  useEffect(() => {
    if (state.home > seen.current.home) correct(settings);
    if (state.bumps > seen.current.bumps) nudge(settings);
    seen.current = { home: state.home, bumps: state.bumps };
  }, [state.home, state.bumps, settings]);

  const onHop = useCallback(
    (way: Hop) => {
      if (paused) return;
      tap(settings);
      setState((prev) => hop(prev, way));
    },
    [paused, settings],
  );

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    seen.current = { home: 0, bumps: 0 };
    setState(createGame(systemRng, atLevel));
  }, []);

  const rowCount = state.rows.length;
  const cell = Math.floor(Math.min(area.width / COLS, area.height / rowCount));
  const yOf = (row: number) => (rowCount - 1 - row) * cell;
  const { duck } = state;
  const ahead = duck.row + 1;
  const aheadWords =
    state.rows[ahead] === 'pond'
      ? 'The pond is right ahead.'
      : state.rows[ahead] === 'road'
        ? clearAt(state, ahead, duck.col, state.time)
          ? 'The road just ahead is clear right now.'
          : 'Traffic just ahead.'
        : 'Grass just ahead.';

  const fresh = state.home === 0 && state.bumps === 0 && duck.row === 0;
  const label = fresh
    ? 'WATCH THE TRAFFIC, THEN HOP UP'
    : state.flashKind === 'bump'
      ? 'BUMP! BACK TO THE GRASS'
      : state.flashKind === 'home'
        ? 'HOME! HERE COMES THE NEXT ONE'
        : state.rows[duck.row] === 'road'
          ? 'KEEP GOING WHEN IT IS CLEAR'
          : 'WAIT FOR A GAP, THEN HOP';
  const stars = starsForMistakes(state.bumps);
  const progress = state.home / DUCKS_PER_ROUND;

  return (
    <GameFrame title="Duck Crossing" icon="duck" onExit={onExit} progress={progress}>
      <StageLabel live>{label}</StageLabel>

      <View
        style={styles.area}
        onLayout={(e) => setArea({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
      >
        {cell > 0 ? (
          <View
            accessible
            accessibilityLabel={`Duckling on row ${duck.row + 1} of ${rowCount}, column ${duck.col + 1}. ${aheadWords} ${state.home} of ${DUCKS_PER_ROUND} home.`}
            testID={`duck-board:${rowCount}x${COLS}`}
            style={[styles.board, { width: cell * COLS, height: cell * rowCount }]}
          >
            {state.rows.map((kind, row) => (
              <View
                key={`row${row}`}
                testID={kind === 'road' ? `lane:${row}:${state.lanes[row].dir}:${state.lanes[row].speed.toFixed(4)}` : `row:${row}:${kind}`}
                style={[
                  styles.row,
                  { top: yOf(row), height: cell },
                  kind === 'grass' ? styles.grass : kind === 'pond' ? styles.pond : styles.road,
                ]}
              >
                {/* Lane lines between two roads. */}
                {kind === 'road' && state.rows[row + 1] === 'road'
                  ? Array.from({ length: COLS }, (_, c) => (
                      <View key={c} style={[styles.dash, { left: c * cell + cell * 0.3, width: cell * 0.4 }]} />
                    ))
                  : null}
                {/* Ducklings already home, bobbing in the pond. */}
                {kind === 'pond'
                  ? Array.from({ length: state.home }, (_, i) => (
                      <View key={i} style={{ position: 'absolute', left: (1 + i * 2) * cell, top: 0 }}>
                        <Duckling size={cell} bumped={false} />
                      </View>
                    ))
                  : null}
              </View>
            ))}

            {state.rows.map((kind, row) =>
              kind !== 'road'
                ? null
                : vehiclesAt(state.lanes[row], state.time).map((v, i) => {
                    const dir = state.lanes[row].dir;
                    const w = v.length * cell;
                    return (
                      <View
                        key={`v${row}:${i}`}
                        testID={`car:${row}:${v.left.toFixed(2)}:${v.right.toFixed(2)}`}
                        style={[
                          styles.vehicle,
                          { left: v.left * cell + 2, top: yOf(row) + cell * 0.14, width: w - 4, height: cell * 0.72, backgroundColor: PAINT[row % PAINT.length] },
                        ]}
                      >
                        {/* Windscreen at the front, wheels at the corners. */}
                        <View style={[styles.screen, { [dir === 1 ? 'right' : 'left']: cell * 0.12, width: cell * 0.16, top: cell * 0.12, bottom: cell * 0.12 }]} />
                        {[0, 1].map((end) =>
                          [0, 1].map((side) => (
                            <View
                              key={`${end}${side}`}
                              style={[
                                styles.wheel,
                                {
                                  [end ? 'right' : 'left']: cell * 0.1,
                                  [side ? 'bottom' : 'top']: -cell * 0.06,
                                  width: cell * 0.2,
                                  height: cell * 0.1,
                                },
                              ]}
                            />
                          )),
                        )}
                      </View>
                    );
                  }),
            )}

            <View testID={`duck:${duck.row}:${duck.col}`} style={{ position: 'absolute', left: duck.col * cell, top: yOf(duck.row) }}>
              <Duckling size={cell} bumped={state.flashKind === 'bump'} />
            </View>
          </View>
        ) : null}
      </View>

      <AnswerRow style={styles.pad}>
        {ARROWS.map(({ way, turn }) => (
          <AnswerButton key={way} accessibilityLabel={`Hop ${way}`} size={hitTarget + 8} onPress={() => onHop(way)}>
            <View style={{ transform: [{ rotate: turn }] }}>
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
  board: { overflow: 'hidden', borderWidth: rule.major, borderColor: palette.ink, backgroundColor: palette.surface },
  row: { position: 'absolute', left: 0, right: 0 },
  grass: { backgroundColor: playPalette.leaf },
  road: { backgroundColor: palette.inkSoft },
  pond: { backgroundColor: playPalette.sky },
  dash: { position: 'absolute', top: -1, height: rule.major, backgroundColor: palette.bg },
  vehicle: { position: 'absolute' },
  screen: { position: 'absolute', backgroundColor: palette.bg },
  wheel: { position: 'absolute', backgroundColor: palette.ink },
  body: { backgroundColor: playPalette.sun },
  pad: { paddingBottom: space.lg },
});
