import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import {
  SETS_PER_ROUND,
  createGame,
  createSet,
  nextSet,
  specForLevel,
  tapItem,
  wanted,
  type BigToSmallState,
} from '../src/games/bigtosmall/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];

test('every set has the level\'s count, one shape, and a clear step between each size', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    for (let seed = 0; seed < 200; seed += 1) {
      const set = createSet(seededRng(seed * 3 + level), level);
      assert.equal(set.items.length, spec.items);
      const byRank = [...set.items].sort((a, b) => a.rank - b.rank);
      assert.deepEqual(byRank.map((i) => i.rank), Array.from({ length: spec.items }, (_, i) => i));
      for (let r = 1; r < byRank.length; r += 1) {
        const step = byRank[r].scale / byRank[r - 1].scale;
        assert.ok(step <= 0.9 + 1e-9, `level ${level}: a step of ${step.toFixed(2)} is too close to see`);
        assert.ok(step < 1, 'a smaller rank is never the same size or bigger');
      }
      if (!spec.turned) assert.ok(set.items.every((i) => i.turn === 0));
      if (spec.turned) assert.notEqual(set.shape, 'circle', 'a turned circle is no harder');
    }
  }
});

test('the smallest shape is still big enough to see on a 72dp tile', () => {
  for (const level of LEVELS) {
    const { items, ratio } = specForLevel(level);
    const smallest = 72 * 0.74 * ratio ** (items - 1);
    assert.ok(smallest >= 18, `level ${level}: the smallest is ${smallest.toFixed(0)}px`);
  }
});

test('colour never gives the order away before level 5', () => {
  for (const level of [1, 2, 3, 4]) {
    for (let seed = 0; seed < 100; seed += 1) {
      const set = createSet(seededRng(seed + 99), level);
      assert.equal(new Set(set.items.map((i) => i.color)).size, 1);
    }
  }
});

test('a set is never dealt already in order', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < 300; seed += 1) {
      const ranks = createSet(seededRng(seed + 7000), level).items.map((i) => i.rank);
      const sorted = [...ranks].sort((a, b) => a - b);
      assert.notDeepEqual(ranks, sorted);
      assert.notDeepEqual(ranks, [...sorted].reverse());
    }
  }
});

function finishSet(s: BigToSmallState): BigToSmallState {
  let out = s;
  while (!out.done) out = tapItem(out, wanted(out));
  return out;
}

test('biggest first, down to the smallest; four sets end the round', () => {
  const rng = seededRng(5);
  let s = createGame(seededRng(5), 3);
  for (let i = 0; i < SETS_PER_ROUND; i += 1) {
    assert.equal(s.complete, false);
    s = finishSet(s);
    assert.equal(s.placed.length, s.set.items.length);
    assert.deepEqual(s.placed.map((p) => s.set.items[p].rank), s.placed.map((_, r) => r));
    s = nextSet(s, rng, 3);
  }
  assert.equal(s.complete, true);
  assert.equal(s.mistakes, 0);
});

test('one out of turn is one mistake, charged once, and it stays to be placed later', () => {
  const s = createGame(seededRng(6), 4);
  const early = s.set.items.findIndex((i) => i.rank === 2);
  const once = tapItem(s, early);
  assert.equal(once.mistakes, 1);
  assert.equal(tapItem(once, early), once, 'the same wrong tap is not charged again');
  assert.deepEqual(once.placed, []);
  const next = tapItem(once, wanted(once));
  assert.deepEqual(next.missed, [], 'a right tap clears the slate');
});

test('nothing moves while a finished line is on show', () => {
  const s = finishSet(createGame(seededRng(8), 2));
  assert.equal(s.done, true);
  assert.equal(tapItem(s, 0), s);
});
