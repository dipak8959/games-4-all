import type { Rng } from '../../util/random';
import { canGo, createMaze, neighbour, shortestWalk, type Dir, type Maze } from '../maze/logic';

/**
 * Maze Team — a game for a group, played as one team.
 *
 * One explorer, one maze — and the arrows shared out. With two players one
 * has left and right, the other up and down; with four, an arrow each. The
 * explorer goes one square per press, so nobody gets anywhere alone: the
 * team has to look, agree, and call out "your turn — up!"
 *
 * It practises working together: talking a route through and taking turns
 * at the controls, with the spatial planning a maze always asks for. It
 * grows the way Maze Explorer does — bigger mazes, then a key to fetch
 * before the door to the flag opens. Two mazes make a round.
 *
 * Walls cost nothing but a step not taken; the stars come from how directly
 * the team got there.
 */

export const MAZES_PER_ROUND = 2;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;

export type MazeTeamState = {
  readonly maze: Maze;
  readonly at: number;
  readonly hasKey: boolean;
  readonly visited: readonly number[];
  readonly steps: number;
  readonly roundSteps: number;
  readonly roundShortest: number;
  readonly mazeIndex: number;
  readonly players: number;
  /** The flag is reached and the maze is on show for a moment. */
  readonly done: boolean;
  readonly complete: boolean;
};

/** Maze sizes follow Maze Explorer's, level for level. */
export { specForLevel } from '../maze/logic';

/** Which player each arrow belongs to, for a team this size. */
export function owners(players: number): Record<Dir, number> {
  const n = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, players));
  if (n === 2) return { left: 0, right: 0, up: 1, down: 1 };
  if (n === 3) return { left: 0, right: 1, up: 2, down: 2 };
  return { left: 0, right: 1, up: 2, down: 3 };
}

function fresh(rng: Rng, level: number, players: number, prior?: MazeTeamState): MazeTeamState {
  const maze = createMaze(rng, level);
  return {
    maze,
    at: maze.start,
    hasKey: false,
    visited: [maze.start],
    steps: 0,
    roundSteps: prior?.roundSteps ?? 0,
    roundShortest: (prior?.roundShortest ?? 0) + shortestWalk(maze),
    mazeIndex: prior ? prior.mazeIndex + 1 : 0,
    players: Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, players)),
    done: false,
    complete: false,
  };
}

export function createGame(rng: Rng, level: number, players: number): MazeTeamState {
  return fresh(rng, level, players);
}

/** One press: one square that way, if it's open. */
export function step(state: MazeTeamState, dir: Dir): MazeTeamState {
  if (state.done || state.complete || !canGo(state.maze, state.at, dir, state.hasKey)) return state;
  const at = neighbour(state.maze, state.at, dir) as number;
  return {
    ...state,
    at,
    hasKey: state.hasKey || at === state.maze.key,
    visited: state.visited.includes(at) ? state.visited : [...state.visited, at],
    steps: state.steps + 1,
    roundSteps: state.roundSteps + 1,
    done: at === state.maze.goal,
  };
}

export function nextMaze(state: MazeTeamState, rng: Rng, level: number): MazeTeamState {
  if (!state.done) return state;
  if (state.mazeIndex + 1 >= MAZES_PER_ROUND) return { ...state, done: false, complete: true };
  return fresh(rng, level, state.players, state);
}

export { starsForWalk } from '../maze/logic';
