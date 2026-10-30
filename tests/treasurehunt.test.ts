import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import {
  MAPS_PER_ROUND,
  arrowFrom,
  createGame,
  createMap,
  dig,
  nextMap,
  specForLevel,
  stepsFrom,
  stillPossible,
  type TreasureHuntState,
} from '../src/games/treasurehunt/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];

test('every square fits a phone at full size: never more than four across', () => {
  for (const level of LEVELS) assert.ok(specForLevel(level).cols <= 4);
});

test('an arrow points at the treasure, and steps count up, down and across', () => {
  const map = { cols: 4, rows: 5, treasure: 4 * 3 + 1, clue: 'arrow' as const }; // row 3, column 1
  assert.deepEqual(arrowFrom(map, 0), { dx: 1, dy: 1 });
  assert.deepEqual(arrowFrom(map, 4 * 3 + 3), { dx: -1, dy: 0 });
  assert.deepEqual(arrowFrom(map, 1), { dx: 0, dy: 1 });
  assert.equal(stepsFrom({ ...map, clue: 'steps' }, 0), 4);
});

/** Always digs a square the clues still allow — the one nearest the middle
 *  of what's left. */
function detective(state: TreasureHuntState): TreasureHuntState {
  let s = state;
  while (!s.found) {
    const left = stillPossible(s.map, s.dug);
    s = dig(s, left[Math.floor(left.length / 2)]);
  }
  return s;
}

test('following the clues always finds the treasure, never a mistake, in few digs', () => {
  for (const level of LEVELS) {
    let most = 0;
    for (let seed = 0; seed < 200; seed += 1) {
      const s = detective(createGame(seededRng(seed * 13 + level), level));
      assert.equal(s.mistakes, 0);
      most = Math.max(most, s.dug.length);
    }
    const { cols, rows } = specForLevel(level);
    assert.ok(most < cols * rows, `level ${level}: clues never narrowed it down`);
  }
});

test('the clues narrow it down: a treasure always has its square in what is left', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < 100; seed += 1) {
      const map = createMap(seededRng(seed + 400 * level), level);
      let dug: number[] = [];
      for (let d = 0; d < 3; d += 1) {
        const left = stillPossible(map, dug);
        assert.ok(left.includes(map.treasure) || dug.includes(map.treasure));
        const next = left.find((c) => c !== map.treasure);
        if (next === undefined) break;
        dug = [...dug, next];
      }
    }
  }
});

test('a guess is never a mistake; digging where the clues ruled it out is, once per square', () => {
  const s = createGame(seededRng(3), 4);
  const first = s.map.treasure === 0 ? 1 : 0;
  const one = dig(s, first); // nothing known yet: a guess
  assert.equal(one.mistakes, 0);
  const ruledOut = Array.from({ length: s.map.cols * s.map.rows }, (_, c) => c).find(
    (c) => !one.dug.includes(c) && !stillPossible(one.map, one.dug).includes(c),
  );
  if (ruledOut !== undefined) {
    const two = dig(one, ruledOut);
    assert.equal(two.mistakes, 1);
    assert.equal(dig(two, ruledOut), two, 'the same hole dug twice');
  }
});

test('three treasures end the round, never under the same square twice running', () => {
  const rng = seededRng(5);
  let s = createGame(seededRng(5), 2);
  for (let i = 0; i < MAPS_PER_ROUND; i += 1) {
    assert.equal(s.complete, false);
    const before = s.map.treasure;
    s = nextMap(detective(s), rng, 2);
    if (!s.complete) assert.notEqual(s.map.treasure, before);
  }
  assert.equal(s.complete, true);
});
