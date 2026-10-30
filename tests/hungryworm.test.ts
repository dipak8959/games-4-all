import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import {
  APPLES_PER_ROUND,
  createGame,
  neighbour,
  specForLevel,
  step,
  turn,
  type Dir,
  type HungryWormState,
} from '../src/games/hungryworm/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];
const DIRS: Dir[] = ['up', 'right', 'down', 'left'];

/** The first step of a shortest way to the apple, around the worm and the
 *  rocks; any open way if there is none. */
function towardApple(s: HungryWormState): Dir {
  // The tail only moves out of the way when the worm isn't growing.
  const body = s.growing > 0 ? s.worm : s.worm.slice(0, -1);
  const blocked = new Set([...body, ...s.rocks]);
  const first = new Map<number, Dir>();
  let frontier = [s.worm[0]];
  const seen = new Set(frontier);
  while (frontier.length) {
    const next: number[] = [];
    for (const cell of frontier) {
      for (const d of DIRS) {
        const n = neighbour(s.cols, s.rows, cell, d);
        if (n === null || blocked.has(n) || seen.has(n)) continue;
        seen.add(n);
        first.set(n, first.get(cell) ?? d);
        if (n === s.apple) return first.get(n) as Dir;
        next.push(n);
      }
    }
    frontier = next;
  }
  return DIRS.find((d) => {
    const n = neighbour(s.cols, s.rows, s.worm[0], d);
    return n !== null && !blocked.has(n);
  }) ?? s.dir;
}

function play(state: HungryWormState, choose: ((s: HungryWormState) => Dir) | null, seconds = 300): HungryWormState {
  const rng = seededRng(4);
  let s = turn(state, 'right');
  for (let f = 0; f < seconds * 30 && !s.complete; f += 1) {
    if (choose) s = turn(s, choose(s));
    s = step(s, 1 / 30, rng);
  }
  return s;
}

test('nothing moves until the first arrow', () => {
  const s = createGame(seededRng(1), 3);
  assert.deepEqual(step(s, 5, seededRng(1)), s);
});

test('rocks never wall off any square, and the apple is always somewhere reachable', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < 50; seed += 1) {
      const s = createGame(seededRng(seed * 3 + level), level);
      assert.equal(s.rocks.length, specForLevel(level).rocks);
      assert.ok(s.apple >= 0 && !s.worm.includes(s.apple) && !s.rocks.includes(s.apple));
    }
  }
});

test('a player who heads for each apple eats all ten, at every level, with hardly a bump', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < 10; seed += 1) {
      const s = play(createGame(seededRng(seed + 100 * level), level), towardApple);
      assert.equal(s.complete, true, `level ${level} seed ${seed}: ate ${s.eaten}`);
      assert.equal(s.eaten, APPLES_PER_ROUND);
      assert.ok(s.bumps <= 2, `level ${level} seed ${seed}: ${s.bumps} bumps`);
    }
  }
});

test('a bump stops the worm and costs one, never more, however long it waits', () => {
  const s = play(createGame(seededRng(2), 2), null, 60);
  assert.equal(s.complete, false, 'no apples, no end — but nothing is lost either');
  assert.equal(s.stuck, true);
  assert.equal(s.bumps, 1, 'waiting against the wall is not more bumps');
  // Pressing into the wall again while stuck is still just the one bump.
  const again = step(turn(s, 'right'), 5, seededRng(2));
  assert.equal(again.bumps, 1);
});

test('a worm curled up tight pulls its tail in until it can move again', () => {
  // Head at the top left, boxed in by its own body on every side.
  const s0 = createGame(seededRng(1), 1);
  const cols = s0.cols;
  const worm = [cols + 1, cols + 2, 2 * cols + 2, 2 * cols + 1, 2 * cols, cols, 0, 1, 2, 3];
  let s: HungryWormState = { ...s0, worm, dir: 'up', started: true, apple: 5 * cols + 5 };
  const rng = seededRng(1);
  let moved = false;
  for (let i = 0; i < 40 && !moved; i += 1) {
    s = step(s, s.tick, rng);
    moved = s.worm[0] !== cols + 1;
    if (!moved) s = turn(s, (['up', 'right', 'down', 'left'] as Dir[])[i % 4]);
  }
  assert.ok(moved, 'the worm stayed boxed in for ever');
  assert.equal(s.bumps, 1);
});

test('the worm cannot turn straight back on itself', () => {
  const s = turn(createGame(seededRng(3), 1), 'right');
  const back = turn(s, 'left');
  assert.equal(back.dir, 'right');
});

test('every level steps faster than the one before', () => {
  for (let l = 2; l <= 6; l += 1) assert.ok(specForLevel(l).tick < specForLevel(l - 1).tick);
});
