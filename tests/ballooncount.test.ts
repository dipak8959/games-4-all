import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import {
  BUNCHES_PER_ROUND,
  balloonsForLevel,
  createBunch,
  createGame,
  nextBunch,
  nextNumber,
  pop,
  specForLevel,
  type BalloonCountState,
} from '../src/games/ballooncount/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];

test('every bunch is a real count: evenly stepped, in range, all different', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    for (let seed = 0; seed < 300; seed += 1) {
      const b = createBunch(seededRng(seed * 11 + level), level);
      assert.equal(b.count.length, spec.members);
      assert.ok(b.count.every((v) => v >= 1 && v <= spec.max), `level ${level}: ${b.count} out of range`);
      const diffs = b.count.slice(1).map((v, i) => v - b.count[i]);
      assert.equal(new Set(diffs).size, 1, 'not evenly stepped');
      assert.equal(Math.abs(diffs[0]), b.step);
      assert.ok(spec.steps.includes(b.step));
      if (!spec.down) assert.ok(diffs[0] > 0, 'counting down before the level allows it');
      if (spec.prefilled === 0) assert.equal(b.count[0], 1, 'the youngest always count from one');
      if (b.step >= 5) assert.equal(b.count[0] % b.step, 0, 'fives and tens start on a multiple');
    }
  }
});

test('the balloons are the rest of the count plus the level\'s decoys, all different numbers', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    for (let seed = 0; seed < 300; seed += 1) {
      const b = createBunch(seededRng(seed + 1000 * level), level);
      assert.equal(b.balloons.length, balloonsForLevel(level));
      const values = b.balloons.map((x) => x.value);
      assert.equal(new Set(values).size, values.length, 'two balloons with the same number');
      const decoys = b.balloons.filter((x) => !x.member);
      assert.equal(decoys.length, spec.decoys);
      assert.ok(decoys.every((d) => !b.count.includes(d.value)), 'a decoy that is part of the count');
      assert.ok(decoys.every((d) => d.value >= 1 && d.value <= spec.max));
    }
  }
});

test('where the count needs a start shown, it is on the string, and two for a direction or step', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    if (spec.down || spec.steps.length > 1) assert.equal(spec.prefilled, 2, `level ${level}`);
    else if (spec.prefilled > 0) assert.equal(spec.prefilled, 1);
  }
});

function popAll(state: BalloonCountState): BalloonCountState {
  let s = state;
  while (!s.done) {
    const want = nextNumber(s);
    s = pop(s, s.bunch.balloons.findIndex((b) => b.value === want));
  }
  return s;
}

test('popping in order fills the string; four bunches end the round with no mistakes', () => {
  const rng = seededRng(2);
  let s = createGame(seededRng(2), 5);
  for (let i = 0; i < BUNCHES_PER_ROUND; i += 1) {
    assert.equal(s.complete, false);
    s = popAll(s);
    assert.equal(nextNumber(s), null);
    s = nextBunch(s, rng, 5);
  }
  assert.equal(s.complete, true);
  assert.equal(s.mistakes, 0);
});

test('a balloon out of turn is one mistake, charged once, and a decoy never pops', () => {
  const s = createGame(seededRng(7), 6);
  const decoy = s.bunch.balloons.findIndex((b) => !b.member);
  const once = pop(s, decoy);
  assert.equal(once.mistakes, 1);
  assert.equal(pop(once, decoy), once);
  assert.deepEqual(once.popped, []);
  const done = popAll(once);
  assert.ok(!done.popped.includes(decoy), 'the decoy was popped into the count');
});
