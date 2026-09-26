import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import { distancesFrom, type Dir } from '../src/games/maze/logic.ts';
import {
  MAZES_PER_ROUND,
  createGame,
  nextMaze,
  owners,
  starsForWalk,
  step,
  type MazeTeamState,
} from '../src/games/mazeteam/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];
const DIRS: Dir[] = ['up', 'right', 'down', 'left'];

test('every arrow belongs to exactly one player, and every player has one', () => {
  for (const n of [2, 3, 4]) {
    const o = owners(n);
    assert.deepEqual(Object.keys(o).sort(), ['down', 'left', 'right', 'up']);
    assert.deepEqual([...new Set(Object.values(o))].sort(), Array.from({ length: n }, (_, i) => i));
  }
  assert.deepEqual(owners(2), { left: 0, right: 0, up: 1, down: 1 });
});

/** A team that always steps towards the key (if there is one) and then the
 *  flag, by the shortest way. */
function playWell(start: MazeTeamState, level: number): MazeTeamState {
  const rng = seededRng(level);
  let s = start;
  for (let guard = 0; guard < 5000 && !s.complete; guard += 1) {
    if (s.done) {
      s = nextMaze(s, rng, level);
      continue;
    }
    const target = s.maze.key !== null && !s.hasKey ? s.maze.key : s.maze.goal;
    const dist = distancesFrom(s.maze, target);
    const before = s;
    for (const d of DIRS) {
      const next = step(s, d);
      if (next !== s && dist[next.at] >= 0 && dist[next.at] < dist[s.at]) {
        s = next;
        break;
      }
    }
    assert.notEqual(s, before, 'stuck with nowhere closer to go');
  }
  return s;
}

test('a team that plans the route finishes both mazes directly, at every level', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < 8; seed += 1) {
      const s = playWell(createGame(seededRng(seed + level * 20), level, 2), level);
      assert.equal(s.complete, true);
      assert.equal(s.mazeIndex, MAZES_PER_ROUND - 1);
      assert.equal(starsForWalk(s.roundSteps, s.roundShortest), 3);
    }
  }
});

test('one press is one square, and a wall is no step at all', () => {
  const s = createGame(seededRng(1), 3, 3);
  for (const d of DIRS) {
    const next = step(s, d);
    if (next === s) continue;
    assert.equal(next.steps, 1);
    assert.notEqual(next.at, s.at);
  }
  const walls = DIRS.filter((d) => step(s, d) === s);
  assert.ok(walls.length >= 1, 'a start with no walls at all');
});
