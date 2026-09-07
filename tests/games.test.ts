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
  deserializeHistory,
  EMPTY_SHAPES_HISTORY,
  historyFrom,
  isMatch,
  ITEMS_PER_ROUND,
  place,
  serializeHistory,
  sortRuleForLevel,
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

test('memory draws from a picture pool bigger than one round needs, for replay variety', () => {
  const seen = new Set<string>();
  for (let seed = 0; seed < 40; seed++) {
    for (const card of createMemory(seededRng(seed), 3).cards) seen.add(card.symbol);
  }
  // pairsForLevel(3) draws only 5 pictures per round; seeing more than that
  // across many replays proves the pool is larger than a single round.
  assert.ok(seen.size > 5, `only saw ${seen.size} distinct pictures across 40 replays`);
});

test('memory avoids every picture the previous round just used, when the pool allows it', () => {
  for (let seed = 0; seed < 100; seed++) {
    const level = 3; // 5 pairs per round, well under the 20-picture pool
    const previous = createMemory(seededRng(seed), level);
    const previousSymbols = new Set(previous.cards.map((c) => c.symbol));

    const next = createMemory(seededRng(seed + 1000), level, previousSymbols);
    const nextSymbols = new Set(next.cards.map((c) => c.symbol));

    for (const symbol of nextSymbols) {
      assert.ok(!previousSymbols.has(symbol), `seed ${seed}: ${symbol} repeated from the previous round`);
    }
  }
});

test('memory still fills the round even if the entire picture pool were avoided', () => {
  // Mirrors memory/logic.ts's SYMBOLS pool. Avoiding all of it is the
  // worst case sampleFresh has to handle: nothing is "fresh" at all.
  const wholePool = new Set([
    '🐰', '🐸', '🐼', '🦋', '🐟', '🐝', '🍎', '🍌', '🍓', '⭐', '🌙', '🌻',
    '🐶', '🐱', '🐷', '🐵', '🍇', '🍊', '🥕', '🚗',
  ]);
  const state = createMemory(seededRng(2), 6, wholePool);
  assert.equal(state.cards.length, pairsForLevel(6) * 2);
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

test('counting draws pictures from a pool bigger than one question needs, for variety', () => {
  const seen = new Set<string>();
  for (let seed = 0; seed < 40; seed++) seen.add(createQuestion(seededRng(seed), 1).symbol);
  assert.ok(seen.size > 1, 'every replay showed the same picture');
});

test('counting never repeats the avoided picture back-to-back', () => {
  for (let seed = 0; seed < 300; seed++) {
    const q = createQuestion(seededRng(seed), 1, '🍎');
    assert.notEqual(q.symbol, '🍎');
  }
});

test('an entire round never shows the same picture on two consecutive questions', () => {
  const rng = seededRng(42);
  let state = createCounting(rng, 2);
  const symbolsSeen = [state.question.symbol];

  for (let i = 0; i < QUESTIONS_PER_ROUND - 1; i++) {
    state = answer(state, state.question.count, rng, 2);
    symbolsSeen.push(state.question.symbol);
  }

  for (let i = 1; i < symbolsSeen.length; i++) {
    assert.notEqual(symbolsSeen[i], symbolsSeen[i - 1], `question ${i} repeated question ${i - 1}'s picture`);
  }
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

      const expectedBaskets =
        state.sortBy === 'size' ? 2 : basketsForLevel(state.sortBy, level);
      assert.equal(state.baskets.length, expectedBaskets, `seed ${seed} level ${level}`);
      assert.equal(state.queue.length, ITEMS_PER_ROUND);

      for (const item of state.queue) {
        const matching = state.baskets.filter((b) => isMatch(state, item, b));
        assert.equal(matching.length, 1, `seed ${seed} level ${level}: ${matching.length} baskets match`);
      }
    }
  }
});

test('shape and colour baskets are distinguishable by their own sorting rule', () => {
  for (let seed = 0; seed < 200; seed++) {
    const state = createShapes(seededRng(seed), 5);
    if (state.sortBy === 'size') continue; // size baskets are distinguished by size, not glyph
    const attribute = state.sortBy === 'shape' ? 'shape' : 'color';
    assert.equal(new Set(state.baskets.map((b) => b[attribute])).size, state.baskets.length);
  }
});

test('level 1 always sorts by shape, the more concrete rule', () => {
  for (let seed = 0; seed < 50; seed++) {
    assert.equal(createShapes(seededRng(seed), 1).sortBy, 'shape');
  }
});

test('size sorting never appears before level 3, once shape and colour are established', () => {
  for (let seed = 0; seed < 200; seed++) {
    assert.notEqual(sortRuleForLevel(seededRng(seed), 1), 'size');
    assert.notEqual(sortRuleForLevel(seededRng(seed), 2), 'size');
  }
});

test('a size-sort round always has exactly a small and a big basket', () => {
  let sawSize = false;
  for (let seed = 0; seed < 200; seed++) {
    const state = createShapes(seededRng(seed), 6);
    if (state.sortBy !== 'size') continue;
    sawSize = true;
    assert.deepEqual(
      state.baskets.map((b) => b.key).sort(),
      ['big', 'small'],
    );
  }
  assert.ok(sawSize, 'no seed in this range ever rolled a size round at level 6');
});

test('sortRuleForLevel never repeats the avoided rule when another is available', () => {
  for (let seed = 0; seed < 300; seed++) {
    const rng = seededRng(seed);
    for (const avoid of ['shape', 'color', 'size'] as const) {
      assert.notEqual(sortRuleForLevel(rng, 4, avoid), avoid, `seed ${seed}, avoiding ${avoid}`);
    }
  }
});

test('sortRuleForLevel falls back to shape at level 1 even if shape is avoided', () => {
  for (let seed = 0; seed < 50; seed++) {
    assert.equal(sortRuleForLevel(seededRng(seed), 1, 'shape'), 'shape');
  }
});

test('a fresh round of shapes never repeats the previous round\'s sort rule', () => {
  for (let seed = 0; seed < 200; seed++) {
    const rng = seededRng(seed);
    const first = createShapes(rng, 4);
    const second = createShapes(rng, 4, historyFrom(first));
    assert.notEqual(second.sortBy, first.sortBy, `seed ${seed}`);
  }
});

test('a fresh shape-sort round avoids every shape the previous round used, when the pool allows it', () => {
  for (let seed = 0; seed < 200; seed++) {
    const rng = seededRng(seed);
    const first = createShapes(rng, 1); // level 1 always rolls 'shape'
    const second = createShapes(seededRng(seed + 5000), 1, historyFrom(first));

    if (second.sortBy !== 'shape') continue; // only 'shape' possible at level 1, but stay defensive
    const previousShapes = new Set(first.baskets.map((b) => b.shape));
    for (const basket of second.baskets) {
      assert.ok(!previousShapes.has(basket.shape), `seed ${seed}: basket shape ${basket.shape} repeated`);
    }
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

test('shapes history survives a JSON round trip (Sets are not JSON-safe on their own)', () => {
  for (let seed = 0; seed < 50; seed++) {
    const state = createShapes(seededRng(seed), 5);
    const original = historyFrom(state);

    const roundTripped = JSON.parse(JSON.stringify(serializeHistory(original)));
    const restored = deserializeHistory(roundTripped);

    assert.equal(restored.sortBy, original.sortBy);
    assert.deepEqual([...restored.shapes].sort(), [...original.shapes].sort());
    assert.deepEqual([...restored.colors].sort(), [...original.colors].sort());
  }
});

test('deserializeHistory tolerates missing, malformed, or absent storage', () => {
  assert.deepEqual(deserializeHistory(undefined), EMPTY_SHAPES_HISTORY);
  assert.deepEqual(deserializeHistory(null), EMPTY_SHAPES_HISTORY);
  assert.deepEqual(deserializeHistory('not an object'), EMPTY_SHAPES_HISTORY);
  assert.deepEqual(deserializeHistory({ sortBy: 'nonsense', shapes: 'not an array' }), EMPTY_SHAPES_HISTORY);
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
