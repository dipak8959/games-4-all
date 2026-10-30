import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import { startingLevelForAge } from '../src/games/types.ts';
import {
  answer,
  createGame,
  createQuestion,
  operatorsForLevel,
  QUESTIONS_PER_ROUND,
} from '../src/games/numbercrunch/logic.ts';

test('operators join in school order: +, then -, then ×, then ÷', () => {
  assert.deepEqual(operatorsForLevel(1), ['+']);
  assert.deepEqual(operatorsForLevel(2), ['+', '-']);
  assert.deepEqual(operatorsForLevel(3), ['+', '-']);
  assert.deepEqual(operatorsForLevel(4), ['+', '-', '×']);
  assert.deepEqual(operatorsForLevel(5), ['+', '-', '×', '÷']);
  assert.deepEqual(operatorsForLevel(6), ['+', '-', '×', '÷']);
});

test('an out-of-range level is clamped rather than crashing', () => {
  assert.deepEqual(operatorsForLevel(0), operatorsForLevel(1));
  assert.deepEqual(operatorsForLevel(99), operatorsForLevel(6));
});

// --- magnitudes match arithmetic milestones ----------------------------------

test('level 1 keeps sums within 10, the first addition children meet', () => {
  for (let seed = 0; seed < 200; seed++) {
    const q = createQuestion(seededRng(seed), 1);
    assert.equal(q.operator, '+');
    assert.ok(q.answer <= 10, `seed ${seed}: ${q.a} + ${q.b} = ${q.answer} exceeds 10`);
  }
});

test('level 2 keeps addition and subtraction within 20 (the Grade 1 benchmark)', () => {
  for (let seed = 0; seed < 300; seed++) {
    const q = createQuestion(seededRng(seed), 2);
    assert.ok(q.a <= 20 && q.b <= 20, `seed ${seed}: terms above 20`);
    assert.ok(q.answer <= 20, `seed ${seed}: ${q.a} ${q.operator} ${q.b} = ${q.answer} exceeds 20`);
  }
});

test('level 3 introduces two-digit work within 100, without multiplication yet', () => {
  let sawTwoDigit = false;
  for (let seed = 0; seed < 300; seed++) {
    const q = createQuestion(seededRng(seed), 3);
    assert.ok(q.operator === '+' || q.operator === '-', `seed ${seed}: unexpected ${q.operator}`);
    assert.ok(q.answer <= 100, `seed ${seed}: ${q.answer} exceeds 100`);
    if (q.a >= 10 || q.b >= 10) sawTwoDigit = true;
  }
  assert.ok(sawTwoDigit, 'level 3 never produced a two-digit term');
});

test('the top level draws only large, hard-to-retrieve facts for × and ÷', () => {
  // The problem-size effect: 2 × 3 is retrieved instantly and is not a
  // question for an adult, so the factor floor rises with level.
  for (let seed = 0; seed < 400; seed++) {
    const q = createQuestion(seededRng(seed), 6);
    if (q.operator === '×') {
      assert.ok(q.a >= 6 && q.b >= 6, `seed ${seed}: ${q.a} × ${q.b} is below the top-level floor`);
    }
    if (q.operator === '÷') {
      assert.ok(q.b >= 6, `seed ${seed}: divisor ${q.b} is below the top-level floor`);
      assert.ok(q.answer >= 6, `seed ${seed}: quotient ${q.answer} is below the top-level floor`);
    }
  }
});

test('subtraction draws a minuend worth subtracting from, not just the smallest', () => {
  let sawLarge = false;
  for (let seed = 0; seed < 300; seed++) {
    const q = createQuestion(seededRng(seed), 6);
    if (q.operator === '-' && q.a >= 50) sawLarge = true;
  }
  assert.ok(sawLarge, 'top-level subtraction never used a large minuend');
});

// --- wrong answers mirror real error patterns --------------------------------

test('multiplication decoys come from an operand\'s own times table', () => {
  // ~88% of adults' multiplication errors are operand-related, so a decoy
  // should be a number that a real confusion could land on — not a value no
  // times table ever reaches.
  let checked = 0;
  for (let seed = 0; seed < 400 && checked < 40; seed++) {
    const q = createQuestion(seededRng(seed), 6);
    if (q.operator !== '×') continue;
    checked++;
    for (const choice of q.choices) {
      if (choice === q.answer) continue;
      const inATable = choice % q.a === 0 || choice % q.b === 0 || choice === q.a + q.b;
      assert.ok(
        inATable,
        `seed ${seed}: ${choice} is not related to either operand of ${q.a} × ${q.b}`,
      );
    }
  }
  assert.ok(checked > 0, 'no multiplication questions were sampled');
});

test('adult-level decoys never include the beginner "wrong operation" slip', () => {
  // "6 × 7 -> 13" is a real learner error but an adult eliminates it on
  // sight, which wastes one of only two decoy slots and hands back a free
  // question. It belongs at the lower levels only.
  for (let seed = 0; seed < 400; seed++) {
    const q = createQuestion(seededRng(seed), 6);
    if (q.operator !== '×') continue;
    assert.ok(
      !q.choices.includes(q.a + q.b) || q.a + q.b === q.answer,
      `seed ${seed}: ${q.a} × ${q.b} offered ${q.a + q.b}, the sum`,
    );
  }
});

test('multi-digit addition decoys include a carry-sized slip, not just off-by-one', () => {
  let sawTenAway = false;
  for (let seed = 0; seed < 400; seed++) {
    const q = createQuestion(seededRng(seed), 6);
    if (q.operator !== '+') continue;
    if (q.choices.some((c) => Math.abs(c - q.answer) === 10)) sawTenAway = true;
  }
  assert.ok(sawTenAway, 'two-digit addition never offered a dropped-carry decoy');
});

test('no question ever offers the same number twice or a negative one', () => {
  for (const level of [1, 2, 3, 4, 5, 6]) {
    for (let seed = 0; seed < 200; seed++) {
      const q = createQuestion(seededRng(seed + level * 1000), level);
      assert.equal(new Set(q.choices).size, q.choices.length, `level ${level} seed ${seed}: duplicate choice`);
      assert.ok(q.choices.every((c) => c >= 0), `level ${level} seed ${seed}: negative choice`);
      assert.ok(q.choices.includes(q.answer), `level ${level} seed ${seed}: answer missing`);
    }
  }
});

test("an adult's very first question already uses the full operator set", () => {
  // The complaint this guards against: a 41-year-old opening the game and
  // being asked "6 + 7" for several rounds before it offers anything harder.
  const adultLevel = startingLevelForAge(41);
  assert.deepEqual(operatorsForLevel(adultLevel), ['+', '-', '×', '÷']);

  // A six-year-old gets add and subtract within 20 — the Grade 1 benchmark —
  // and no multiplication or division, which they haven't met yet.
  assert.deepEqual(operatorsForLevel(startingLevelForAge(6)), ['+', '-']);

  // Times tables arrive around 8-9, division shortly after.
  assert.ok(operatorsForLevel(startingLevelForAge(9)).includes('×'));
  assert.ok(!operatorsForLevel(startingLevelForAge(7)).includes('×'));
  assert.ok(operatorsForLevel(startingLevelForAge(12)).includes('÷'));
});

test('every question is answered correctly by its own arithmetic', () => {
  for (const level of [1, 2, 3, 4, 5, 6]) {
    for (let seed = 0; seed < 50; seed++) {
      const q = createQuestion(seededRng(seed + level * 1000), level);
      const expected =
        q.operator === '+' ? q.a + q.b : q.operator === '-' ? q.a - q.b : q.operator === '×' ? q.a * q.b : q.a / q.b;
      assert.equal(q.answer, expected, `level ${level} seed ${seed}`);
      assert.ok(q.choices.includes(q.answer), `level ${level} seed ${seed}: answer missing from choices`);
    }
  }
});

test('subtraction never produces a negative result', () => {
  for (let seed = 0; seed < 200; seed++) {
    const q = createQuestion(seededRng(seed), 4);
    if (q.operator !== '-') continue;
    assert.ok(q.answer >= 0, `seed ${seed}: ${q.a} - ${q.b} = ${q.answer}`);
  }
});

test('division always divides evenly, with a divisor of at least 2', () => {
  for (let seed = 0; seed < 300; seed++) {
    const q = createQuestion(seededRng(seed), 6);
    if (q.operator !== '÷') continue;
    assert.ok(q.b >= 2, `seed ${seed}: divisor ${q.b} is too small`);
    assert.equal(q.a % q.b, 0, `seed ${seed}: ${q.a} ÷ ${q.b} does not divide evenly`);
    assert.ok(Number.isInteger(q.answer), `seed ${seed}: ${q.a} ÷ ${q.b} = ${q.answer} is not a whole number`);
  }
});

test('division never appears before multiplication is introduced', () => {
  for (const level of [1, 2, 3, 4]) {
    for (let seed = 0; seed < 100; seed++) {
      const q = createQuestion(seededRng(seed + level * 1000), level);
      assert.notEqual(q.operator, '÷', `level ${level} seed ${seed}: division appeared too early`);
    }
  }
});

test('choices are three distinct, non-negative numbers', () => {
  for (const level of [1, 3, 6]) {
    for (let seed = 0; seed < 50; seed++) {
      const q = createQuestion(seededRng(seed + level * 1000), level);
      assert.equal(new Set(q.choices).size, 3, `level ${level} seed ${seed}`);
      assert.ok(q.choices.every((c) => c >= 0), `level ${level} seed ${seed}: negative choice`);
    }
  }
});

test('a fresh question avoids repeating the exact previous question', () => {
  for (let seed = 0; seed < 100; seed++) {
    const first = createQuestion(seededRng(seed), 1);
    const firstKey = `${first.a}${first.operator}${first.b}`;
    const second = createQuestion(seededRng(seed + 1000), 1, firstKey);
    const secondKey = `${second.a}${second.operator}${second.b}`;
    assert.notEqual(secondKey, firstKey, `seed ${seed}`);
  }
});

test('a correct answer advances to the next question with zero mistakes', () => {
  const rng = seededRng(1);
  const state = createGame(rng, 1);
  const next = answer(state, state.question.answer, rng, 1);
  assert.equal(next.questionIndex, 1);
  assert.equal(next.mistakes, 0);
  assert.deepEqual(next.ruledOut, []);
});

test('a wrong answer rules out that choice and costs a mistake, without advancing', () => {
  const rng = seededRng(2);
  const state = createGame(rng, 1);
  const wrong = state.question.choices.find((c) => c !== state.question.answer);
  if (wrong === undefined) return; // every choice happened to be the answer; nothing to test here

  const next = answer(state, wrong, rng, 1);
  assert.equal(next.questionIndex, 0);
  assert.equal(next.mistakes, 1);
  assert.deepEqual(next.ruledOut, [wrong]);
});

test('tapping an already-ruled-out choice again does nothing', () => {
  const rng = seededRng(3);
  let state = createGame(rng, 1);
  const wrong = state.question.choices.find((c) => c !== state.question.answer);
  if (wrong === undefined) return;

  state = answer(state, wrong, rng, 1);
  const again = answer(state, wrong, rng, 1);
  assert.deepEqual(again, state);
});

test('solving every question in a round completes it with zero mistakes', () => {
  const rng = seededRng(7);
  let state = createGame(rng, 2);

  for (let i = 0; i < QUESTIONS_PER_ROUND; i++) {
    assert.equal(state.complete, false, `round ended early at question ${i}`);
    state = answer(state, state.question.answer, rng, 2);
  }

  assert.equal(state.complete, true);
  assert.equal(state.mistakes, 0);
});

test('nothing after completion can be answered further', () => {
  const rng = seededRng(9);
  let state = createGame(rng, 1);
  for (let i = 0; i < QUESTIONS_PER_ROUND; i++) {
    state = answer(state, state.question.answer, rng, 1);
  }
  assert.equal(state.complete, true);

  const after = answer(state, state.question.answer, rng, 1);
  assert.deepEqual(after, state);
});
