import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AnswerButton, AnswerRow, StageLabel } from '../../components/GameStage';
import { GameFrame } from '../../components/GameFrame';
import { Icon } from '../../components/Icon';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge, tap } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { hitTarget, palette, rule, space } from '../../theme/tokens';
import { systemRng } from '../../util/random';
import { nextLevel, type GameScreenProps } from '../types';
import {
  MAZES_PER_ROUND,
  canGo,
  createGame,
  nextMaze,
  starsForWalk,
  walk,
  waysOut,
  type Dir,
  type MazeState,
} from './logic';

/** How long the explorer takes over each square of a run. */
const STEP_MS = 70;
/** How long a finished maze stays on show before the next. */
const DONE_MS = 1000;

const ARROWS: readonly { dir: Dir; turn: string; name: string }[] = [
  { dir: 'left', turn: '0deg', name: 'left' },
  { dir: 'up', turn: '90deg', name: 'up' },
  { dir: 'down', turn: '270deg', name: 'down' },
  { dir: 'right', turn: '180deg', name: 'right' },
];

const where = (state: MazeState, cell: number) =>
  `row ${Math.floor(cell / state.maze.cols) + 1}, column ${(cell % state.maze.cols) + 1}`;

export function MazeScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  const [level, setLevel] = useState(initialLevel);
  const [state, setState] = useState<MazeState>(() => createGame(systemRng, level));
  const [area, setArea] = useState({ width: 0, height: 0 });
  // How far along the last run the explorer is drawn.
  const [shown, setShown] = useState(0);

  useEffect(() => {
    setShown(settings.reduceMotion ? state.lastRun.length : 0);
    if (settings.reduceMotion || state.lastRun.length === 0) return undefined;
    const timer = setInterval(() => {
      setShown((n) => {
        if (n + 1 >= state.lastRun.length) clearInterval(timer);
        return n + 1;
      });
    }, STEP_MS);
    return () => clearInterval(timer);
  }, [state.lastRun, settings.reduceMotion]);

  useEffect(() => {
    if (!state.done) return undefined;
    const on = setTimeout(() => setState((prev) => nextMaze(prev, systemRng, level)), DONE_MS);
    return () => clearTimeout(on);
  }, [state.done, level]);

  const onArrow = useCallback(
    (dir: Dir) => {
      setState((prev) => {
        if (prev.done || prev.complete) return prev;
        if (!canGo(prev.maze, prev.at, dir, prev.hasKey)) {
          nudge(settings);
          return prev;
        }
        const next = walk(prev, dir);
        if (next.done || (next.hasKey && !prev.hasKey)) correct(settings);
        else tap(settings);
        return next;
      });
    },
    [settings],
  );

  const restart = useCallback((atLevel: number) => {
    setLevel(atLevel);
    setState(createGame(systemRng, atLevel));
  }, []);

  const { maze } = state;
  const cell = Math.floor(Math.min(area.width / maze.cols, area.height / maze.rows));
  const wall = Math.max(2, Math.round(cell * 0.1));
  const xOf = (c: number) => (c % maze.cols) * cell;
  const yOf = (c: number) => Math.floor(c / maze.cols) * cell;

  const explorerAt =
    shown < state.lastRun.length ? state.lastRun[Math.max(0, shown)] : state.at;
  const ways = waysOut(state);
  const label = state.done
    ? 'YOU MADE IT'
    : maze.key !== null && !state.hasKey
      ? 'GET THE KEY, THEN THE FLAG'
      : maze.key !== null
        ? 'NOW THE DOOR IS OPEN'
        : 'FIND THE WAY TO THE FLAG';

  const stars = starsForWalk(state.roundSteps, state.roundShortest);
  const progress = (state.mazeIndex + (state.done ? 1 : 0)) / MAZES_PER_ROUND;

  const summary = [
    `You are at ${where(state, state.at)}.`,
    ways.length ? `Open: ${ways.join(', ')}.` : '',
    state.cameFrom ? `You came in from ${state.cameFrom === 'up' || state.cameFrom === 'down' ? '' : 'the '}${state.cameFrom === 'up' ? 'above' : state.cameFrom === 'down' ? 'below' : state.cameFrom}.` : '',
    maze.key !== null && !state.hasKey ? `The key is at ${where(state, maze.key)}.` : '',
    `The flag is at ${where(state, maze.goal)}.`,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <GameFrame title="Maze Explorer" icon="maze" onExit={onExit} progress={progress}>
      <StageLabel live>{label}</StageLabel>

      <View
        style={styles.area}
        onLayout={(e) => setArea({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
      >
        {cell > 0 ? (
          <View
            accessible
            accessibilityLabel={summary}
            testID={`maze:${maze.cols}x${maze.rows}:${state.mazeIndex}:${state.at}`}
            style={{ width: cell * maze.cols, height: cell * maze.rows }}
          >
            {state.visited.map((c) => (
              <View key={`v${c}`} style={[styles.visited, { left: xOf(c), top: yOf(c), width: cell, height: cell }]} />
            ))}

            {/* Walls: each square's closed top and left, then the far edges. */}
            {maze.open.map((bits, c) => (
              <React.Fragment key={c}>
                {(bits & 1) === 0 ? (
                  <View style={[styles.wall, { left: xOf(c) - wall / 2, top: yOf(c) - wall / 2, width: cell + wall, height: wall }]} />
                ) : null}
                {(bits & 8) === 0 ? (
                  <View style={[styles.wall, { left: xOf(c) - wall / 2, top: yOf(c) - wall / 2, width: wall, height: cell + wall }]} />
                ) : null}
              </React.Fragment>
            ))}
            <View style={[styles.wall, { left: cell * maze.cols - wall / 2, top: -wall / 2, width: wall, height: cell * maze.rows + wall }]} />
            <View style={[styles.wall, { left: -wall / 2, top: cell * maze.rows - wall / 2, width: cell * maze.cols + wall, height: wall }]} />

            {maze.door !== null && !state.hasKey ? <Door state={state} cell={cell} wall={wall} /> : null}
            {maze.key !== null && !state.hasKey ? (
              <View style={{ position: 'absolute', left: xOf(maze.key), top: yOf(maze.key) }}>
                <KeyMark size={cell} />
              </View>
            ) : null}
            <View style={{ position: 'absolute', left: xOf(maze.goal), top: yOf(maze.goal) }}>
              <Flag size={cell} />
            </View>
            <View
              testID="explorer"
              style={{ position: 'absolute', left: xOf(explorerAt), top: yOf(explorerAt) }}
            >
              <Explorer size={cell} />
            </View>
          </View>
        ) : null}
      </View>

      <AnswerRow style={styles.pad}>
        {ARROWS.map(({ dir, turn, name }) => {
          const open = ways.includes(dir);
          return (
            <AnswerButton
              key={dir}
              accessibilityLabel={`Go ${name}${open ? '' : ', wall'}`}
              size={hitTarget + 8}
              disabled={state.done}
              onPress={() => onArrow(dir)}
            >
              <View style={{ transform: [{ rotate: turn }] }}>
                <Icon name="back" size={34} color={open ? palette.ink : palette.inkSoft} />
              </View>
            </AnswerButton>
          );
        })}
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

/** The explorer: the same accent block with googly eyes as the Puddle Hop
 *  runner and the Lane Dash car, so a child knows which one is theirs. */
export function Explorer({ size }: { readonly size: number }) {
  const body = size * 0.62;
  const eye = body * 0.34;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: body, height: body, backgroundColor: palette.accent }}>
        {[0.12, 0.54].map((x) => (
          <View
            key={x}
            style={[styles.eye, { width: eye, height: eye, borderRadius: eye / 2, top: body * 0.14, left: body * x }]}
          >
            <View style={{ width: eye * 0.5, height: eye * 0.5, borderRadius: eye / 4, backgroundColor: palette.ink }} />
          </View>
        ))}
      </View>
    </View>
  );
}

/** The flag: a pole and a cloth. */
export function Flag({ size }: { readonly size: number }) {
  return (
    <View style={{ width: size, height: size }}>
      <View style={[styles.pole, { left: size * 0.3, top: size * 0.18, width: Math.max(2, size * 0.07), height: size * 0.66 }]} />
      <View style={[styles.cloth, { left: size * 0.3, top: size * 0.18, width: size * 0.42, height: size * 0.28 }]} />
    </View>
  );
}

/** The key: a ring, a shaft and two teeth. */
export function KeyMark({ size }: { readonly size: number }) {
  const ring = size * 0.34;
  const line = Math.max(2, size * 0.08);
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          position: 'absolute',
          left: size * 0.14,
          top: (size - ring) / 2,
          width: ring,
          height: ring,
          borderRadius: ring / 2,
          borderWidth: line,
          borderColor: palette.ink,
          backgroundColor: palette.sun,
        }}
      />
      <View style={[styles.keyPart, { left: size * 0.14 + ring, top: size / 2 - line / 2, width: size * 0.4, height: line }]} />
      <View style={[styles.keyPart, { left: size * 0.62, top: size / 2, width: line, height: size * 0.14 }]} />
      <View style={[styles.keyPart, { left: size * 0.74, top: size / 2, width: line, height: size * 0.18 }]} />
    </View>
  );
}

/** A locked door: a striped bar across the doorway it blocks. */
export function Door({
  state,
  cell,
  wall,
}: {
  readonly state: Pick<MazeState, 'maze'>;
  readonly cell: number;
  readonly wall: number;
}) {
  const [a, b] = state.maze.door as readonly [number, number];
  const cols = state.maze.cols;
  const across = Math.abs(a - b) === 1; // side by side: the door is upright
  const first = Math.min(a, b);
  const x = (first % cols) * cell;
  const y = Math.floor(first / cols) * cell;
  const thick = wall * 2.5;
  const style = across
    ? { left: x + cell - thick / 2, top: y + wall, width: thick, height: cell - wall * 2 }
    : { left: x + wall, top: y + cell - thick / 2, width: cell - wall * 2, height: thick };
  return <View style={[styles.door, style]} />;
}

const styles = StyleSheet.create({
  area: { flex: 1, alignItems: 'center', justifyContent: 'center', marginBottom: space.md },
  visited: { position: 'absolute', backgroundColor: palette.surfaceAlt },
  wall: { position: 'absolute', backgroundColor: palette.ink },
  door: { position: 'absolute', backgroundColor: palette.sun, borderWidth: rule.major, borderColor: palette.ink },
  eye: { position: 'absolute', backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center' },
  pole: { position: 'absolute', backgroundColor: palette.ink },
  cloth: { position: 'absolute', backgroundColor: palette.accent },
  keyPart: { position: 'absolute', backgroundColor: palette.ink },
  pad: { paddingBottom: space.lg },
});
