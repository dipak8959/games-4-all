import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import { starsForMistakes } from '../src/games/types.ts';
import {
  QUESTIONS_EACH,
  answer,
  createGame,
  makeQuestion,
  specForLevel,
  type Kind,
} from '../src/games/starjar/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];
const KINDS: Kind[] = ['count', 'add', 'times'];

test('every question is right, in range for its kind and level, with one right choice', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    const rng = seededRng(level);
    for (const kind of KINDS) {
      for (let i = 0; i < 300; i += 1) {
        const q = makeQuestion(rng, kind, spec);
        assert.equal(q.choices.length, spec.choices);
        assert.equal(new Set(q.choices).size, q.choices.length);
        assert.equal(q.choices.filter((c) => c === q.answer).length, 1);
        assert.ok(q.choices.every((c) => c >= 0));
        if (kind === 'count') assert.ok(q.a >= 1 && q.a <= spec.countMax && q.answer === q.a);
        if (q.op === '+') assert.equal(q.answer, q.a + q.b);
        if (q.op === '−') assert.equal(q.answer, q.a - q.b);
        if (q.op === '×') assert.equal(q.answer, q.a * q.b);
        if (q.op === '÷') assert.equal(q.answer * q.b, q.a);
        if (kind === 'add') assert.ok(Math.max(q.a, q.answer) <= spec.addMax && q.answer >= 0);
        if (kind === 'times') assert.ok(q.op === '×' ? q.a <= spec.timesMax && q.b <= spec.timesMax : q.answer <= spec.timesMax);
      }
    }
  }
});

test('each player gets their own kind of question, three each, turns going round', () => {
  const rng = seededRng(2);
  const kinds: Kind[] = ['count', 'times', 'add'];
  let s = createGame(seededRng(3), 3, kinds);
  const seen: [number, Kind][] = [];
  while (!s.complete) {
    seen.push([s.turn, s.question.kind]);
    s = answer(s, s.question.answer, rng, 3);
  }
  assert.equal(seen.length, kinds.length * QUESTIONS_EACH);
  seen.forEach(([turn, kind], i) => {
    assert.equal(turn, i % kinds.length);
    assert.equal(kind, kinds[turn]);
  });
  assert.equal(s.stars, kinds.length * QUESTIONS_EACH, 'every right answer is a star in the jar');
  assert.equal(starsForMistakes(s.mistakes), 3);
});

test('a wrong answer is dimmed, costs one, and the same player tries again', () => {
  const rng = seededRng(4);
  let s = createGame(seededRng(5), 2, ['add', 'add']);
  const wrong = s.question.choices.find((c) => c !== s.question.answer)!;
  s = answer(s, wrong, rng, 2);
  assert.equal(s.mistakes, 1);
  assert.equal(s.turn, 0);
  assert.equal(answer(s, wrong, rng, 2), s);
  s = answer(s, s.question.answer, rng, 2);
  assert.equal(s.turn, 1);
  assert.deepEqual(s.ruledOut, []);
});
