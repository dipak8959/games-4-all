import { randInt, shuffle, type Rng } from '../../util/random';

/**
 * Maze Explorer.
 *
 * Walk the explorer through a maze to the flag, with four big arrow
 * buttons. Two mazes make a round.
 *
 * It practises spatial planning: looking along the corridors for the way
 * through, and seeing a dead end before walking into it. It grows from a
 * three-by-three maze with one turn to thirteen rows of ten, and at the top
 * two levels a door stands on the way to the flag and its key is somewhere
 * else — so the route has a detour in it that has to be worked out first.
 *
 * An arrow press walks the explorer along the corridor until something
 * changes: a junction, a dead end, the key, the door or the flag. One press
 * per decision, not one per square, so a big maze is about choosing the way
 * rather than tapping.
 *
 * Every maze is generated fresh, by a depth-first carve that joins every
 * square to every other by exactly one route, so there is always a way
 * through and never a loop to get lost in. The flag is put as far from the
 * start as the maze allows.
 *
 * Nothing is timed and walls cost nothing: walking into one just doesn't go.
 * Stars come from how directly the flag was reached.
 */

export const MAZES_PER_ROUND = 2;

export type Dir = 'up' | 'right' | 'down' | 'left';
const BIT: Record<Dir, number> = { up: 1, right: 2, down: 4, left: 8 };
const DIRS: readonly Dir[] = ['up', 'right', 'down', 'left'];
const OPPOSITE: Record<Dir, Dir> = { up: 'down', right: 'left', down: 'up', left: 'right' };

export type Maze = {
  readonly cols: number;
  readonly rows: number;
  /** Per cell, row by row: which sides are open, as `BIT` flags. */
  readonly open: readonly number[];
  readonly start: number;
  readonly goal: number;
  /** The key's cell and the door (the two cells either side of it), or null. */
  readonly key: number | null;
  readonly door: readonly [number, number] | null;
};

export type MazeState = {
  readonly maze: Maze;
  readonly at: number;
  /** The side of the current square the explorer came in through, if it
   *  has moved — so someone who can't see the maze knows the way back. */
  readonly cameFrom: Dir | null;
  readonly hasKey: boolean;
  /** Squares walked this maze. */
  readonly steps: number;
  /** Squares walked this round, and the fewest that would have done. */
  readonly roundSteps: number;
  readonly roundShortest: number;
  /** Squares visited this maze, for the faint trail. */
  readonly visited: readonly number[];
  /** The squares the last press walked through, in order, for the screen to
   *  animate along. */
  readonly lastRun: readonly number[];
  readonly mazeIndex: number;
  /** The flag is reached and the finished maze is on show for a moment. */
  readonly done: boolean;
  readonly complete: boolean;
};

type LevelSpec = {
  readonly cols: number;
  readonly rows: number;
  readonly key: boolean;
};

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [
  { cols: 3, rows: 3, key: false },
  { cols: 4, rows: 4, key: false },
  { cols: 5, rows: 6, key: false },
  { cols: 7, rows: 8, key: false },
  { cols: 8, rows: 10, key: true },
  { cols: 10, rows: 13, key: true },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

export function neighbour(maze: Pick<Maze, 'cols' | 'rows'>, cell: number, dir: Dir): number | null {
  const r = Math.floor(cell / maze.cols);
  const c = cell % maze.cols;
  if (dir === 'up') return r > 0 ? cell - maze.cols : null;
  if (dir === 'down') return r < maze.rows - 1 ? cell + maze.cols : null;
  if (dir === 'left') return c > 0 ? cell - 1 : null;
  return c < maze.cols - 1 ? cell + 1 : null;
}

const isDoor = (maze: Maze, a: number, b: number) =>
  maze.door !== null && ((maze.door[0] === a && maze.door[1] === b) || (maze.door[0] === b && maze.door[1] === a));

/** Whether a walker can go from `cell` in `dir` right now. */
export function canGo(maze: Maze, cell: number, dir: Dir, hasKey: boolean): boolean {
  if ((maze.open[cell] & BIT[dir]) === 0) return false;
  const to = neighbour(maze, cell, dir) as number;
  return hasKey || !isDoor(maze, cell, to);
}

/** Steps from `from` to every cell, through open sides (doors counted as
 *  open). */
export function distancesFrom(maze: Maze, from: number): number[] {
  const dist = Array(maze.cols * maze.rows).fill(-1);
  dist[from] = 0;
  let frontier = [from];
  while (frontier.length) {
    const next: number[] = [];
    for (const cell of frontier) {
      for (const dir of DIRS) {
        if ((maze.open[cell] & BIT[dir]) === 0) continue;
        const to = neighbour(maze, cell, dir) as number;
        if (dist[to] === -1) {
          dist[to] = dist[cell] + 1;
          next.push(to);
        }
      }
    }
    frontier = next;
  }
  return dist;
}

/** The one route between two cells. */
function route(maze: Maze, from: number, to: number): number[] {
  const dist = distancesFrom(maze, to);
  const path = [from];
  let cell = from;
  while (cell !== to) {
    const here = cell;
    cell = DIRS.filter((d) => (maze.open[here] & BIT[d]) !== 0)
      .map((d) => neighbour(maze, here, d) as number)
      .find((n) => dist[n] === dist[here] - 1) as number;
    path.push(cell);
  }
  return path;
}

/** The fewest squares from the start to the flag, by way of the key. */
export function shortestWalk(maze: Maze): number {
  if (maze.key === null) return distancesFrom(maze, maze.start)[maze.goal];
  return distancesFrom(maze, maze.start)[maze.key] + distancesFrom(maze, maze.key)[maze.goal];
}

export function createMaze(rng: Rng, level: number): Maze {
  const spec = specForLevel(level);
  // A maze with a key needs a side branch worth the detour on the start's
  // side of the door. Nearly every maze has one; the rare one that doesn't
  // is carved again.
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const maze = carve(rng, spec);
    if (!spec.key) return maze;
    const withKey = placeKey(maze);
    if (withKey) return withKey;
  }
  throw new Error(`No maze with a key for level ${level}`);
}

function carve(rng: Rng, spec: LevelSpec): Maze {
  const { cols, rows } = spec;
  const open = Array(cols * rows).fill(0);
  const seen = Array(cols * rows).fill(false);
  const start = (rows - 1) * cols; // bottom left
  const stack = [start];
  seen[start] = true;
  while (stack.length) {
    const cell = stack[stack.length - 1];
    const ways = shuffle(rng, DIRS).filter((d) => {
      const n = neighbour({ cols, rows }, cell, d);
      return n !== null && !seen[n];
    });
    if (ways.length === 0) {
      stack.pop();
      continue;
    }
    const dir = ways[0];
    const to = neighbour({ cols, rows }, cell, dir) as number;
    open[cell] |= BIT[dir];
    open[to] |= BIT[OPPOSITE[dir]];
    seen[to] = true;
    stack.push(to);
  }
  const base: Maze = { cols, rows, open, start, goal: start, key: null, door: null };
  const fromStart = distancesFrom(base, start);
  return { ...base, goal: fromStart.indexOf(Math.max(...fromStart)) };
}

/** The door goes across the route, well along it; the key as far down a side
 *  branch on the start's side of the door as it can — at least two squares
 *  off the route, so fetching it is a real detour. */
function placeKey(maze: Maze): Maze | null {
  const path = route(maze, maze.start, maze.goal);
  const onPath = new Set(path);
  for (const share of [0.7, 0.6, 0.8, 0.5, 0.9, 0.4]) {
    const at = Math.max(1, Math.floor(path.length * share));
    if (at >= path.length) continue;
    const door: [number, number] = [path[at - 1], path[at]];
    const withDoor: Maze = { ...maze, door };
    const candidates = reachable(withDoor, maze.start, false).filter((c) => !onPath.has(c));
    if (candidates.length === 0) continue;
    const fromRoute = path.slice(0, at).map((p) => distancesFrom(maze, p));
    const depth = (c: number) => Math.min(...fromRoute.map((d) => d[c]));
    const key = candidates.reduce((a, b) => (depth(b) > depth(a) ? b : a));
    if (depth(key) >= 2) return { ...withDoor, key };
  }
  return null;
}

/** Cells a walker can get to from `from`, with or without the key. */
export function reachable(maze: Maze, from: number, hasKey: boolean): number[] {
  const seen = new Set([from]);
  let frontier = [from];
  while (frontier.length) {
    const next: number[] = [];
    for (const cell of frontier) {
      for (const dir of DIRS) {
        if (!canGo(maze, cell, dir, hasKey)) continue;
        const to = neighbour(maze, cell, dir) as number;
        if (!seen.has(to)) {
          seen.add(to);
          next.push(to);
        }
      }
    }
    frontier = next;
  }
  return [...seen];
}

function fresh(rng: Rng, level: number, prev?: MazeState): MazeState {
  const maze = createMaze(rng, level);
  return {
    maze,
    at: maze.start,
    cameFrom: null,
    hasKey: false,
    steps: 0,
    roundSteps: prev?.roundSteps ?? 0,
    roundShortest: (prev?.roundShortest ?? 0) + shortestWalk(maze),
    visited: [maze.start],
    lastRun: [],
    mazeIndex: prev ? prev.mazeIndex + 1 : 0,
    done: false,
    complete: false,
  };
}

export function createGame(rng: Rng, level: number): MazeState {
  return fresh(rng, level);
}

/** Open ways out of a cell right now, counting a locked door as shut. */
export function waysOut(state: MazeState, cell: number = state.at): Dir[] {
  return DIRS.filter((d) => canGo(state.maze, cell, d, state.hasKey));
}

/**
 * An arrow press: walk that way, and keep going along the corridor until
 * there's a choice to make — a junction, a dead end — or something to stop
 * for: the key, a locked door ahead, the flag.
 */
export function walk(state: MazeState, dir: Dir): MazeState {
  if (state.done || state.complete || !canGo(state.maze, state.at, dir, state.hasKey)) return state;
  const { maze } = state;
  let at = state.at;
  let heading = dir;
  let hasKey = state.hasKey;
  const run: number[] = [];
  for (let guard = 0; guard < maze.cols * maze.rows; guard += 1) {
    at = neighbour(maze, at, heading) as number;
    run.push(at);
    if (at === maze.key) hasKey = true;
    if (at === maze.goal || at === maze.key) break;
    const onward = DIRS.filter((d) => d !== OPPOSITE[heading] && (maze.open[at] & BIT[d]) !== 0);
    // A corridor bends or runs on: exactly one way on, and it isn't a door
    // still locked.
    if (onward.length !== 1 || !canGo(maze, at, onward[0], hasKey)) break;
    heading = onward[0];
  }
  const visited = [...state.visited, ...run.filter((c) => !state.visited.includes(c))];
  return {
    ...state,
    at,
    cameFrom: OPPOSITE[heading],
    hasKey,
    steps: state.steps + run.length,
    roundSteps: state.roundSteps + run.length,
    visited,
    lastRun: run,
    done: at === maze.goal,
  };
}

/** After a finished maze has been seen: the next one, or the end. */
export function nextMaze(state: MazeState, rng: Rng, level: number): MazeState {
  if (!state.done) return state;
  if (state.mazeIndex + 1 >= MAZES_PER_ROUND) return { ...state, done: false, complete: true };
  return fresh(rng, level, state);
}

/** Straight there, or near enough, is three stars; a wander is two; a long
 *  wander still one. */
export function starsForWalk(steps: number, shortest: number): number {
  if (steps <= shortest * 1.5) return 3;
  if (steps <= shortest * 3) return 2;
  return 1;
}
