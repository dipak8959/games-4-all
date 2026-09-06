import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import {
  createGame as createMemory,
  flip,
  hasPendingPair,
  pairsForLevel,
  resolvePair,
} from '../src/games/memory/logic.ts';
import {
  answer,
  createGame as createCounting,
  createQuestion,
  QUESTIONS_PER_ROUND,
  rangeForLevel,
} from '../src/games/counting/logic.ts';
import {
  basketsForLevel,
  createGame as createShapes,
  currentItem,
  isMatch,
  ITEMS_PER_ROUND,
  place,
} from '../src/games/shapes/logic.ts';
import { starsForMistakes } from '../src/games/types.ts';

// --- memory -----------------------------------------------------------------

test('memory deals exactly two of every symbol', () => {
  for (let level = 1; level <= 8; level++) {
    const state = createMemory(seededRng(level), level);
    const counts = new Map<string, number>();
    for (const card of state.cards) counts.set(card.symbol, (counts.get(card.symbol) ?? 0) + 1);

    assert.equal(state.cards.length, pairsForLevel(level) * 2, `level ${level}`);
    for (const [symbol, count] of counts) {
      assert.equal(count, 2, `level ${level}: ${symbol} appeared ${count} times`);
    }
  }
});

test('memory grid stays within a size a phone can show', () => {
  assert.equal(pairsForLevel(1), 3);
  assert.equal(pairsForLevel(99), 8, 'pair count is capped');
});

test('memory ignores taps on a revealed card and while a pair is pending', () => {
  let state = createMemory(seededRng(3), 1);
  state = flip(state, 0);
  const afterDouble = flip(state, 0);
  assert.equal(afterDouble.revealed.length, 1, 'tapping the same card twice does nothing');

  state = flip(state, 1);
  assert.equal(hasPendingPair(state), true);
  const afterThird = flip(state, 2);
  assert.equal(afterThird.revealed.length, 2, 'a third card cannot be flipped mid-comparison');
});

test('memory counts a mismatch once and turns both cards back over', () => {
  const state = createMemory(seededRng(11), 2);
  const first = state.cards[0];
  const mismatchIndex = state.cards.findIndex((c) => c.symbol !== first.symbol);

  const resolved = resolvePair(flip(flip(state, 0), mismatchIndex));
  assert.equal(resolved.mistakes, 1);
  assert.equal(resolved.cards[0].faceUp, false);
  assert.equal(resolved.cards[mismatchIndex].faceUp, false);
  assert.equal(resolved.complete, false);
});

test('memory can always be completed, and a perfect game records no mistakes', () => {
  for (let level = 1; level <= 6; level++) {
    let state = createMemory(seededRng(100 + level), level);
    const seen = new Map<string, number>();

    for (const [index, card] of state.cards.entries()) {
      const partner = seen.get(card.symbol);
      if (partner === undefined) {
        seen.set(card.symbol, index);
        continue;
      }
      state = resolvePair(flip(flip(state, partner), index));
    }

    assert.equal(state.complete, true, `level ${level} must be completable`);
    assert.equal(state.mistakes, 0, `level ${level} perfect play records no mistakes`);
    assert.equal(state.cards.every((c) => c.matched), true);
  }
});

// --- counting ---------------------------------------------------------------

test('counting offers three near-miss choices that always include the answer', () => {
  for (let seed = 0; seed < 300; seed++) {
    for (let level = 1; level <= 4; level++) {
      const q = createQuestion(seededRng(seed), level);
      const { min, max } = rangeForLevel(level);

      assert.ok(q.count >= min && q.count <= max, `count ${q.count} outside level ${level} range`);
      assert.equal(q.choices.length, 3);
      assert.equal(new Set(q.choices).size, 3, 'choices must be distinct');
      assert.ok(q.choices.includes(q.count));
      assert.ok(q.choices.every((c) => c >= 1), 'no zero or negative numerals');
    }
  }
});

test('counting never asks for more objects than a young child can count', () => {
  assert.deepEqual(rangeForLevel(1), { min: 1, max: 5 });
  assert.ok(rangeForLevel(99).max <= 12);
});

test('a wrong tap rules that choice out without advancing the round', () => {
  const state = createCounting(seededRng(5), 1);
  const wrong = state.question.choices.find((c) => c !== state.question.count)!;

  const after = answer(state, wrong, seededRng(6), 1);
  assert.equal(after.mistakes, 1);
  assert.equal(after.questionIndex, 0, 'a wrong answer never advances');
  assert.deepEqual(after.ruledOut, [wrong]);
  assert.equal(after.question, state.question, 'the same question stays up');

  const again = answer(after, wrong, seededRng(6), 1);
  assert.equal(again.mistakes, 1, 're-tapping a ruled-out choice is not punished twice');
});

test('counting completes after a fixed number of correct answers', () => {
  let state = createCounting(seededRng(9), 2);
  const rng = seededRng(21);

  for (let i = 0; i < QUESTIONS_PER_ROUND; i++) {
    assert.equal(state.complete, false, `round ended early at question ${i}`);
    state = answer(state, state.question.count, rng, 2);
  }

  assert.equal(state.complete, true);
  assert.equal(state.mistakes, 0);
});

// --- shapes -----------------------------------------------------------------

test('every shapes item belongs to exactly one basket', () => {
  for (let seed = 0; seed < 200; seed++) {
    for (let level = 1; level <= 6; level++) {
      const state = createShapes(seededRng(seed), level);

      assert.equal(state.baskets.length, basketsForLevel(level));
      assert.equal(state.queue.length, ITEMS_PER_ROUND);

      for (const item of state.queue) {
        const matching = state.baskets.filter((b) => isMatch(state, item, b));
        assert.equal(matching.length, 1, `seed ${seed} level ${level}: ${matching.length} baskets match`);
      }
    }
  }
});

test('shapes baskets are distinguishable by both shape and colour', () => {
  for (let seed = 0; seed < 200; seed++) {
    const state = createShapes(seededRng(seed), 5);
    assert.equal(new Set(state.baskets.map((b) => b.shape)).size, state.baskets.length);
    assert.equal(new Set(state.baskets.map((b) => b.color)).size, state.baskets.length);
  }
});

test('level 1 always sorts by shape, the more concrete rule', () => {
  for (let seed = 0; seed < 50; seed++) {
    assert.equal(createShapes(seededRng(seed), 1).sortBy, 'shape');
  }
});

test('a wrong basket keeps the same item up and costs only a mistake', () => {
  const state = createShapes(seededRng(4), 3);
  const item = currentItem(state)!;
  const wrongIndex = state.baskets.findIndex((b) => !isMatch(state, item, b));

  const after = place(state, wrongIndex);
  assert.equal(after.mistakes, 1);
  assert.equal(after.placed, 0, 'progress never moves backwards or forwards on a miss');
  assert.deepEqual(currentItem(after), item, 'the same item stays up until it lands correctly');
});

test('sorting every item correctly completes the round', () => {
  let state = createShapes(seededRng(31), 4);

  for (let i = 0; i < ITEMS_PER_ROUND; i++) {
    const item = currentItem(state)!;
    state = place(state, state.baskets.findIndex((b) => isMatch(state, item, b)));
  }

  assert.equal(state.complete, true);
  assert.equal(state.mistakes, 0);
  assert.equal(currentItem(state), null);
});

// --- scoring ----------------------------------------------------------------

test('finishing a round always earns at least one star', () => {
  for (const mistakes of [0, 1, 2, 3, 50]) {
    assert.ok(starsForMistakes(mistakes) >= 1, `${mistakes} mistakes still earns a star`);
    assert.ok(starsForMistakes(mistakes) <= 3);
  }
  assert.equal(starsForMistakes(0), 3);
  assert.equal(starsForMistakes(2), 2);
  assert.equal(starsForMistakes(3), 1);
});
