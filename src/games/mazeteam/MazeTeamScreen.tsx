import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AnswerButton, AnswerRow, StageLabel } from '../../components/GameStage';
import { GameFrame } from '../../components/GameFrame';
import { Icon } from '../../components/Icon';
import { PlayerMark, PlayersPicker, playerName } from '../../components/Players';
import { RoundComplete } from '../../components/RoundComplete';
import { correct, nudge, tap } from '../../feedback/feedback';
import { useApp } from '../../state/AppProvider';
import { hitTarget, palette, space } from '../../theme/tokens';
import { systemRng } from '../../util/random';
import { canGo, type Dir } from '../maze/logic';
import { Door, Explorer, Flag, KeyMark } from '../maze/MazeScreen';
import { nextLevel, type GameScreenProps } from '../types';
import {
  MAX_PLAYERS,
  MAZES_PER_ROUND,
  MIN_PLAYERS,
  createGame,
  nextMaze,
  owners,
  starsForWalk,
  step,
  type MazeTeamState,
} from './logic';

/** How long a finished maze stays on show before the next. */
const DONE_MS = 1000;

const ARROWS: readonly { dir: Dir; turn: string }[] = [
  { dir: 'left', turn: '0deg' },
  { dir: 'up', turn: '90deg' },
  { dir: 'down', turn: '270deg' },
  { dir: 'right', turn: '180deg' },
];

export function MazeTeamScreen({ level: initialLevel, onRoundComplete, onExit }: GameScreenProps) {
  const { settings } = useApp();
  const [level, setLevel] = useState(initialLevel);
  const [players, setPlayers] = useState(0);
  const [state, setState] = useState<MazeTeamState | null>(null);
  const [area, setArea] = useState({ width: 0, height: 0 });

  const start = useCallback((count: number, atLevel: number) => {
    setPlayers(count);
    setState(createGame(systemRng, atLevel, count));
  }, []);

  useEffect(() => {
    if (!state?.done) return undefined;
    const on = setTimeout(() => setState((prev) => (prev ? nextMaze(prev, systemRng, level) : prev)), DONE_MS);
    return () => clearTimeout(on);
  }, [state?.done, level]);

  const onArrow = useCallback(
    (dir: Dir) => {
      setState((prev) => {
        if (!prev || prev.done || prev.complete) return prev;
        if (!canGo(prev.maze, prev.at, dir, prev.hasKey)) {
          nudge(settings);
          return prev;
        }
        const next = step(prev, dir);
        if (next.done || (next.hasKey && !prev.hasKey)) correct(settings);
        else tap(settings);
        return next;
      });
    },
    [settings],
  );

  if (!state) {
    return (
      <GameFrame title="Maze Team" icon="mazeteam" onExit={onExit} progress={0}>
        <PlayersPicker min={MIN_PLAYERS} max={MAX_PLAYERS} onPick={(n) => start(n, level)} />
      </GameFrame>
    );
  }

  const { maze } = state;
  const who = owners(state.players);
  const cell = Math.floor(Math.min(area.width / maze.cols, area.height / maze.rows));
  const wall = Math.max(2, Math.round(cell * 0.1));
  const xOf = (c: number) => (c % maze.cols) * cell;
  const yOf = (c: number) => Math.floor(c / maze.cols) * cell;
  const label = state.done
    ? 'YOU MADE IT — TOGETHER'
    : maze.key !== null && !state.hasKey
      ? 'GET THE KEY, THEN THE FLAG'
      : 'TALK IT THROUGH: WHO GOES NEXT?';
  const stars = starsForWalk(state.roundSteps, state.roundShortest);
  const progress = (state.mazeIndex + (state.done ? 1 : 0)) / MAZES_PER_ROUND;
  const open = ARROWS.filter((a) => canGo(maze, state.at, a.dir, state.hasKey)).map((a) => a.dir);

  return (
    <GameFrame title="Maze Team" icon="mazeteam" onExit={onExit} progress={progress}>
      <StageLabel live>{label}</StageLabel>

      <View style={styles.area} onLayout={(e) => setArea({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
        {cell > 0 ? (
          <View
            accessible
            accessibilityLabel={`The explorer is at row ${Math.floor(state.at / maze.cols) + 1}, column ${(state.at % maze.cols) + 1}. Open: ${open.join(', ') || 'nothing'}. The flag is at row ${Math.floor(maze.goal / maze.cols) + 1}, column ${(maze.goal % maze.cols) + 1}.`}
            testID={`mazeteam:${maze.cols}x${maze.rows}:${state.mazeIndex}:${state.at}`}
            style={{ width: cell * maze.cols, height: cell * maze.rows }}
          >
            {state.visited.map((c) => (
              <View key={`v${c}`} style={[styles.visited, { left: xOf(c), top: yOf(c), width: cell, height: cell }]} />
            ))}
            {maze.open.map((bits, c) => (
              <React.Fragment key={c}>
                {(bits & 1) === 0 ? <View style={[styles.wall, { left: xOf(c) - wall / 2, top: yOf(c) - wall / 2, width: cell + wall, height: wall }]} /> : null}
                {(bits & 8) === 0 ? <View style={[styles.wall, { left: xOf(c) - wall / 2, top: yOf(c) - wall / 2, width: wall, height: cell + wall }]} /> : null}
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
            <View testID="explorer" style={{ position: 'absolute', left: xOf(state.at), top: yOf(state.at) }}>
              <Explorer size={cell} />
            </View>
          </View>
        ) : null}
      </View>

      {/* Every arrow wears its owner's mark: only they press it. */}
      <AnswerRow style={styles.pad}>
        {ARROWS.map(({ dir, turn }) => (
          <AnswerButton
            key={dir}
            accessibilityLabel={`Go ${dir}, for ${playerName(who[dir])}${open.includes(dir) ? '' : ', wall'}`}
            size={hitTarget + 8}
            disabled={state.done}
            onPress={() => onArrow(dir)}
          >
            <View style={{ transform: [{ rotate: turn }] }}>
              <Icon name="back" size={30} color={open.includes(dir) ? palette.ink : palette.inkSoft} />
            </View>
            <View style={styles.owner}>
              <PlayerMark player={who[dir]} size={24} />
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
            const atLevel = nextLevel(level, stars);
            setLevel(atLevel);
            start(players, atLevel);
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
  visited: { position: 'absolute', backgroundColor: palette.surfaceAlt },
  wall: { position: 'absolute', backgroundColor: palette.ink },
  owner: { marginTop: space.xs },
  pad: { paddingBottom: space.lg },
});
