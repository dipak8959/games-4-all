import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import {
  MAZES_PER_ROUND,
  createGame,
  createMaze,
  distancesFrom,
  nextMaze,
  reachable,
  shortestWalk,
  specForLevel,
  starsForWalk,
  walk,
  waysOut,
  type Dir,
  type MazeState,
} from '../src/games/maze/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];

test('every maze joins every square by exactly one route: no loops, nothing walled off', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < 40; seed += 1) {
      const maze = createMaze(seededRng(seed * 3 + level), level);
      const spec = specForLevel(level);
      assert.equal(maze.open.length, spec.cols * spec.rows);
      const dist = distancesFrom(maze, maze.start);
      assert.ok(dist.every((d) => d >= 0), 'a square no route reaches');
      // A tree has exactly cells - 1 passages.
      const passages = maze.open.reduce((n, bits) => n + [1, 2, 4, 8].filter((b) => bits & b).length, 0) / 2;
      assert.equal(passages, maze.open.length - 1, 'a loop in the maze');
    }
  }
});

test('the flag is as far from the start as the maze allows', () => {
  for (const level of LEVELS) {
    const maze = createMaze(seededRng(level), level);
    const dist = distancesFrom(maze, maze.start);
    assert.equal(dist[maze.goal], Math.max(...dist));
  }
});

test('from level 5 a door blocks the way, and its key is on the near side, off the route', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    for (let seed = 0; seed < 40; seed += 1) {
      const maze = createMaze(seededRng(seed + 500 * level), level);
      if (!spec.key) {
        assert.equal(maze.key, null);
        continue;
      }
      assert.notEqual(maze.key, null, `level ${level} seed ${seed}: no key`);
      const without = reachable(maze, maze.start, false);
      assert.ok(!without.includes(maze.goal), 'the flag is reachable without the key');
      assert.ok(without.includes(maze.key as number), 'the key is behind its own door');
      assert.ok(reachable(maze, maze.start, true).includes(maze.goal));
      assert.ok(shortestWalk(maze) > distancesFrom(maze, maze.start)[maze.goal], 'the key is not a detour');
    }
  }
});

/** Walks the shortest way, using only what the walker can see: which ways
 *  are open from where it stands. */
function solve(state: MazeState): MazeState {
  let s = state;
  for (let guard = 0; guard < 500 && !s.done; guard += 1) {
    const target = s.maze.key !== null && !s.hasKey ? s.maze.key : s.maze.goal;
    const dist = distancesFrom(s.maze, target);
    const dir = waysOut(s).find((d: Dir) => {
      const probe = walk(s, d);
      return dist[probe.lastRun[0]] < dist[s.at];
    }) as Dir;
    s = walk(s, dir);
  }
  return s;
}

test('walking straight there reaches the flag in the fewest squares, and earns three stars', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < 20; seed += 1) {
      const s = solve(createGame(seededRng(seed + level * 17), level));
      assert.equal(s.done, true);
      assert.equal(s.steps, shortestWalk(s.maze));
      assert.equal(starsForWalk(s.steps, shortestWalk(s.maze)), 3);
    }
  }
});

test('one press runs along a corridor and stops where there is a choice', () => {
  for (let seed = 0; seed < 30; seed += 1) {
    const s = createGame(seededRng(seed + 900), 4);
    const dir = waysOut(s)[0];
    const after = walk(s, dir);
    const end = after.at;
    const stopped =
      end === s.maze.goal ||
      end === s.maze.key ||
      waysOut(after, end).length !== 2; // a junction or a dead end
    assert.ok(stopped, 'the run stopped in the middle of a corridor');
    // Every square of the run was walked into, one step at a time.
    assert.equal(after.steps, after.lastRun.length);
  }
});

test('walls and a locked door stop the walker and cost nothing', () => {
  const s = createGame(seededRng(4), 5);
  const walls = (['up', 'right', 'down', 'left'] as Dir[]).filter((d) => !waysOut(s).includes(d));
  for (const d of walls) assert.equal(walk(s, d), s);
});

test('two mazes make a round', () => {
  const rng = seededRng(8);
  let s = createGame(seededRng(8), 2);
  for (let m = 0; m < MAZES_PER_ROUND; m += 1) {
    assert.equal(s.complete, false);
    s = solve(s);
    s = nextMaze(s, rng, 2);
  }
  assert.equal(s.complete, true);
  assert.equal(starsForWalk(s.roundSteps, s.roundShortest), 3);
});

test('stars: straight there is three, a wander two, a long wander still one', () => {
  assert.equal(starsForWalk(10, 10), 3);
  assert.equal(starsForWalk(15, 10), 3);
  assert.equal(starsForWalk(25, 10), 2);
  assert.equal(starsForWalk(90, 10), 1);
});
