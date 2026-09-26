import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import {
  NEAR_MISS,
  QUESTIONS_PER_ROUND,
  TURNABLE,
  choose,
  createGame,
  createQuestion,
  sameExceptColour,
  specForLevel,
} from '../src/games/oddoneout/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];

test('there is exactly one odd one out, and everything else is alike', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < 200; seed += 1) {
      const q = createQuestion(seededRng(seed * 11 + level), level);
      assert.equal(q.items.length, specForLevel(level).items);
      const rest = q.items.filter((_, i) => i !== q.odd);
      for (const item of rest) {
        assert.ok(sameExceptColour(item, rest[0]), `level ${level} seed ${seed}: two of the others differ`);
      }
      assert.ok(!sameExceptColour(q.items[q.odd], rest[0]), `level ${level} seed ${seed}: the odd one isn't odd`);
    }
  }
});

test('the odd one never differs by colour alone', () => {
  // Roughly one boy in twelve can't separate red from green. The odd one
  // must always be findable by shape, size or which way up it is.
  for (const level of LEVELS) {
    for (let seed = 0; seed < 300; seed += 1) {
      const q = createQuestion(seededRng(seed + level * 1000), level);
      const odd = q.items[q.odd];
      const other = q.items[(q.odd + 1) % q.items.length];
      const byShape = odd.shape !== other.shape;
      const bySize = odd.scale !== other.scale;
      const byTurn = odd.turned !== other.turned;
      assert.ok(byShape || bySize || byTurn, `level ${level} seed ${seed}: only colour tells it apart`);
    }
  }
});

test('colour is a shared cue at the easy end and noise at the hard end, never the answer', () => {
  for (const level of LEVELS) {
    const { colourNoise } = specForLevel(level);
    for (let seed = 0; seed < 100; seed += 1) {
      const q = createQuestion(seededRng(seed * 3 + level), level);
      const others = q.items.filter((_, i) => i !== q.odd).map((i) => i.color);
      if (!colourNoise) {
        assert.equal(new Set(others).size, 1, `level ${level}: the others should share one colour`);
      }
    }
  }
  // And at the noisy levels the colours really are mixed up.
  let mixed = 0;
  for (let seed = 0; seed < 50; seed += 1) {
    const q = createQuestion(seededRng(seed), 6);
    if (new Set(q.items.map((i) => i.color)).size > 1) mixed += 1;
  }
  assert.ok(mixed > 45);
});

test('only shapes that look different upside down are ever turned', () => {
  for (const level of [4, 5, 6]) {
    for (let seed = 0; seed < 300; seed += 1) {
      const q = createQuestion(seededRng(seed), level);
      if (q.difference === 'turn') {
        assert.ok(TURNABLE.includes(q.items[q.odd].shape), `a turned ${q.items[q.odd].shape} looks the same`);
      }
    }
  }
});

test('a wrong tap is one mistake and dims that shape; the group stays', () => {
  const rng = seededRng(4);
  const state = createGame(seededRng(4), 3);
  const wrong = (state.question.odd + 1) % state.question.items.length;
  const after = choose(state, wrong, rng, 3);
  assert.equal(after.mistakes, 1);
  assert.deepEqual(after.ruledOut, [wrong]);
  assert.equal(after.question, state.question);
  assert.equal(choose(after, wrong, rng, 3), after, 'tapping a dimmed shape again costs nothing');
});

test('six groups make a round, and then it is over', () => {
  const rng = seededRng(9);
  let state = createGame(seededRng(9), 5);
  for (let i = 0; i < QUESTIONS_PER_ROUND; i += 1) {
    assert.equal(state.complete, false);
    state = choose(state, state.question.odd, rng, 5);
  }
  assert.equal(state.complete, true);
  assert.equal(state.mistakes, 0);
  assert.equal(choose(state, 0, rng, 5), state);
});

test('the same kind of difference is not asked twice in a row when there is a choice', () => {
  for (const level of [2, 3, 4, 5, 6]) {
    for (let seed = 0; seed < 100; seed += 1) {
      const first = createQuestion(seededRng(seed), level);
      const next = createQuestion(seededRng(seed + 500), level, first.difference);
      assert.notEqual(next.difference, first.difference);
    }
  }
});

test('no shape ever stands out by colour — right or wrong', () => {
  // Colours picked at random left one shape as the only one of its colour in
  // 72% of level-5 groups: a lone blue star among orange ones reads as the
  // odd one out to any child, and tapping it was marked wrong. Now every
  // colour on a mixed board is used at least three times.
  for (const level of [5, 6]) {
    for (let seed = 0; seed < 1000; seed += 1) {
      const q = createQuestion(seededRng(seed * 7 + level), level);
      const counts = new Map<string, number>();
      for (const item of q.items) counts.set(item.color, (counts.get(item.color) ?? 0) + 1);
      for (const [colour, n] of counts) {
        assert.ok(n >= 3, `level ${level} seed ${seed}: only ${n} ${colour} on the board`);
      }
      assert.ok(counts.size > 1, 'the colours are still mixed up');
    }
  }
  // Below the mixed levels, colour is never a hint beyond levels 1-2.
  for (const level of [3, 4]) {
    for (let seed = 0; seed < 300; seed += 1) {
      const q = createQuestion(seededRng(seed), level);
      assert.equal(new Set(q.items.map((i) => i.color)).size, 1);
    }
  }
});

test('a different shape is a near miss from level 4, like the other differences there', () => {
  // A heart among circles stayed as easy at level 6 as at level 2, next to
  // size and turn groups that had become genuinely hard — so one group was
  // trivial and the next took real looking. From level 4 a shape group is a
  // diamond among squares or the other way round.
  for (const level of [4, 5, 6]) {
    for (let seed = 0; seed < 300; seed += 1) {
      const q = createQuestion(seededRng(seed * 3 + level), level);
      if (q.difference !== 'shape') continue;
      for (const item of q.items) assert.ok(NEAR_MISS.includes(item.shape), `level ${level}: a ${item.shape}`);
    }
  }
  // And at the top, the upside-down one is always the subtle star.
  for (const level of [5, 6]) {
    for (let seed = 0; seed < 300; seed += 1) {
      const q = createQuestion(seededRng(seed), level);
      if (q.difference === 'turn') assert.equal(q.items[q.odd].shape, 'star');
    }
  }
});
