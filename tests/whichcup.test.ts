import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import {
  QUESTIONS_PER_ROUND,
  ballAfter,
  ballCup,
  createGame,
  createQuestion,
  cupPlaces,
  next,
  pick,
  specForLevel,
  startShuffle,
  stopShuffle,
  type WhichCupState,
} from '../src/games/whichcup/logic.ts';
import { hitTarget } from '../src/theme/tokens.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];

test('every question has the level\'s cups and swaps, and the ball moves at least once', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    for (let seed = 0; seed < 300; seed += 1) {
      const q = createQuestion(seededRng(seed * 11 + level), level);
      assert.equal(q.cups, spec.cups);
      assert.equal(q.swaps.length, spec.swaps);
      assert.ok(q.start >= 0 && q.start < q.cups);
      assert.notEqual(ballAfter(q, 1), q.start, 'the first swap moves the ball');
      for (const [i, [a, b]] of q.swaps.entries()) {
        assert.ok(a < b && a >= 0 && b < q.cups, `swap ${a}-${b} is off the row`);
        if (spec.reach === 'next') assert.equal(b - a, 1, 'only neighbours swap at this level');
        if (i > 0 && q.cups > 2) {
          const [pa, pb] = q.swaps[i - 1];
          assert.ok(!(pa === a && pb === b), 'the same two cups swapped straight back');
        }
      }
    }
  }
});

test('four cups at most, so every cup is a full-size target across a phone', () => {
  // 4 x 72dp plus the 1px gaps fits inside a 360dp-wide phone's gutters.
  for (const level of LEVELS) {
    const { cups } = specForLevel(level);
    assert.ok(cups * hitTarget + (cups - 1) <= 360 - 32, `${cups} cups don't fit`);
  }
});

test('the cups drawn on screen end where the answer says the ball is', () => {
  // The picture and the rule are the same thing: follow the ball's cup
  // through `cupPlaces` and it lands on `ballAfter`.
  for (const level of LEVELS) {
    const { swapMs } = specForLevel(level);
    for (let seed = 0; seed < 100; seed += 1) {
      const q = createQuestion(seededRng(seed + 500 * level), level);
      const end = cupPlaces(q, q.swaps.length * swapMs, swapMs);
      assert.equal(end[ballCup(q)].x, ballAfter(q));
      // Every slot holds exactly one cup at rest.
      assert.deepEqual(end.map((p) => p.x).sort(), Array.from({ length: q.cups }, (_, i) => i));
    }
  }
});

test('mid-swap, one cup rides over and the other under, and nothing jumps', () => {
  const q = createQuestion(seededRng(4), 4);
  const { swapMs } = specForLevel(4);
  let before = cupPlaces(q, 0, swapMs);
  for (let ms = 10; ms <= q.swaps.length * swapMs; ms += 10) {
    const now = cupPlaces(q, ms, swapMs);
    for (let cup = 0; cup < q.cups; cup += 1) {
      assert.ok(Math.abs(now[cup].x - before[cup].x) < 0.2, `cup ${cup} jumped at ${ms}ms`);
    }
    const lifts = now.map((p) => p.lift).filter((l) => l !== 0);
    if (lifts.length === 2) assert.ok(lifts[0] * lifts[1] < 0, 'both cups passing on the same side');
    before = now;
  }
});

function play(state: WhichCupState, slot: number): WhichCupState {
  return pick(stopShuffle(startShuffle(state)), slot);
}

test('nothing can be picked until the shuffle is over', () => {
  const s = createGame(seededRng(1), 3);
  const answer = ballAfter(s.question);
  assert.equal(pick(s, answer), s);
  assert.equal(pick(startShuffle(s), answer).phase, 'shuffle');
});

test('a wrong cup is one mistake, stays lifted, and is never charged twice', () => {
  const s = stopShuffle(startShuffle(createGame(seededRng(2), 4)));
  const wrong = [0, 1, 2, 3].find((c) => c !== ballAfter(s.question)) as number;
  const once = pick(s, wrong);
  assert.equal(once.mistakes, 1);
  assert.deepEqual(once.ruledOut, [wrong]);
  assert.equal(once.phase, 'choose');
  assert.equal(pick(once, wrong), once);
});

test('five balls found end the round', () => {
  const rng = seededRng(3);
  let s = createGame(seededRng(3), 2);
  for (let i = 0; i < QUESTIONS_PER_ROUND; i += 1) {
    assert.equal(s.complete, false);
    s = play(s, ballAfter(s.question));
    assert.equal(s.phase, 'found');
    s = next(s, rng, 2);
  }
  assert.equal(s.complete, true);
  assert.equal(s.mistakes, 0);
});

test('nothing moves quickly, at any level', () => {
  for (const level of LEVELS) {
    assert.ok(specForLevel(level).swapMs >= 700, `level ${level} swaps faster than a child can follow`);
  }
});
