import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import {
  answer,
  createGame,
  createQuestion,
  operatorsForLevel,
  QUESTIONS_PER_ROUND,
} from '../src/games/numbercrunch/logic.ts';

test('addition only at the easiest levels, then subtraction, then multiplication', () => {
  assert.deepEqual(operatorsForLevel(1), ['+']);
  assert.deepEqual(operatorsForLevel(2), ['+']);
  assert.deepEqual(operatorsForLevel(3), ['+', '-']);
  assert.deepEqual(operatorsForLevel(4), ['+', '-']);
  assert.deepEqual(operatorsForLevel(5), ['+', '-', '×']);
  assert.deepEqual(operatorsForLevel(6), ['+', '-', '×']);
});

test('every question is answered correctly by its own arithmetic', () => {
  for (const level of [1, 2, 3, 4, 5, 6]) {
    for (let seed = 0; seed < 50; seed++) {
      const q = createQuestion(seededRng(seed + level * 1000), level);
      const expected = q.operator === '+' ? q.a + q.b : q.operator === '-' ? q.a - q.b : q.a * q.b;
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
