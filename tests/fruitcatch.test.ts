import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import {
  BASKET_TIME,
  THINGS_PER_ROUND,
  createGame,
  moveTo,
  roundLength,
  specForLevel,
  starsForMisses,
  step,
  type FruitCatchState,
} from '../src/games/fruitcatch/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];
const FRAME = 1 / 60;

/** Plays a round at 60fps. `choose` picks a column each frame, or null. */
function play(state: FruitCatchState, choose: (s: FruitCatchState) => number | null): FruitCatchState {
  let s = moveTo(state, 0); // the first tap starts the round
  for (let f = 0; f < 60 * 120 && !s.complete; f += 1) {
    const column = choose(s);
    if (column !== null) s = moveTo(s, column);
    s = step(s, FRAME);
  }
  return s;
}

/** Heads for the next fruit to land, stepping aside from any cone first. */
function perfect(s: FruitCatchState): number | null {
  const next = s.things.find((t) => t.landing === null && s.elapsed >= t.dropAt);
  if (!next) return null;
  if (next.kind !== 'cone') return next.column;
  if (s.basket !== next.column) return null;
  return next.column === 0 ? 1 : next.column - 1;
}

test('nothing falls until the first tap, and that tap only starts the round', () => {
  const s = createGame(seededRng(1), 3);
  assert.deepEqual(step(s, 5), s);
  const going = moveTo(s, 0);
  assert.equal(going.started, true);
  assert.equal(going.basket, s.basket);
});

test('every round is twenty things and ends at a time fixed before it starts', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < 30; seed += 1) {
      const s = createGame(seededRng(seed * 7 + level), level);
      assert.equal(s.things.length, THINGS_PER_ROUND);
      const seconds = roundLength(s);
      assert.ok(seconds > 15 && seconds < 70, `level ${level}: ${seconds.toFixed(1)}s`);
      const done = play(s, () => null);
      assert.equal(done.complete, true);
      assert.ok(Math.abs(done.elapsed - seconds) < 0.1, 'it ends when the last thing has landed');
    }
  }
});

test('pine cones only from level 3; the first three things are always fruit', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    for (let seed = 0; seed < 50; seed += 1) {
      const s = createGame(seededRng(seed + 100 * level), level);
      const cones = s.things.filter((t) => t.kind === 'cone').length;
      assert.equal(cones, Math.round(THINGS_PER_ROUND * spec.cones));
      assert.ok(s.things.slice(0, 3).every((t) => t.kind !== 'cone'));
    }
  }
});

test('every thing can be reached: the basket gets anywhere well before the next lands', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < 50; seed += 1) {
      const s = createGame(seededRng(seed + 7000), level);
      for (let i = 1; i < s.things.length; i += 1) {
        const gap = s.things[i].dropAt - s.things[i - 1].dropAt;
        assert.ok(gap >= specForLevel(level).spawnGap - 1e-9, 'things closer than the level allows');
        assert.ok(gap > BASKET_TIME * 4, 'no time to see it and move');
      }
      for (let i = 2; i < s.things.length; i += 1) {
        const [a, b, c] = [s.things[i - 2], s.things[i - 1], s.things[i]].map((t) => t.column);
        assert.ok(!(a === b && b === c), 'three in one column running');
      }
    }
  }
});

test('a player who follows the fruit catches everything, at every level', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < 20; seed += 1) {
      const s = play(createGame(seededRng(seed + level * 31), level), perfect);
      assert.equal(s.misses, 0, `level ${level} seed ${seed}: ${s.misses} missed`);
      assert.equal(starsForMisses(s.misses), 3);
    }
  }
});

test('a basket left still misses fruit and costs stars, but the round still ends', () => {
  const s = play(createGame(seededRng(9), 4), () => null);
  assert.equal(s.complete, true);
  assert.ok(s.misses > 5);
  assert.equal(starsForMisses(s.misses), 1);
});

test('a pine cone in the basket is a miss; one let fall is not', () => {
  const s = createGame(seededRng(12), 6);
  const cone = s.things.findIndex((t) => t.kind === 'cone');
  const column = s.things[cone].column;
  // Sit under it the whole round, from before it lands.
  const bumped = play(s, (now) => (now.elapsed < s.things[cone].dropAt + s.fallTime ? column : null));
  assert.equal(bumped.things[cone].landing, 'bumped');
  const other = column === 0 ? 1 : 0;
  const dodged = play(s, (now) => (now.elapsed < s.things[cone].dropAt + s.fallTime ? other : null));
  assert.equal(dodged.things[cone].landing, 'dodged');
});

test('one miss is still three stars; stars never reach zero', () => {
  assert.equal(starsForMisses(0), 3);
  assert.equal(starsForMisses(1), 3);
  assert.equal(starsForMisses(3), 2);
  assert.equal(starsForMisses(20), 1);
});
