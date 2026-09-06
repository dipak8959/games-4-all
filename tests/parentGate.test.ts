import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createChallenge,
  GATE_SESSION_MS,
  isCorrect,
  isGateStillOpen,
} from '../src/safety/parentGate.ts';
import { seededRng } from '../src/util/random.ts';

test('every challenge offers four distinct choices containing the answer', () => {
  for (let seed = 0; seed < 500; seed++) {
    const challenge = createChallenge(seededRng(seed));
    assert.equal(challenge.choices.length, 4, `seed ${seed}`);
    assert.equal(new Set(challenge.choices).size, 4, `seed ${seed}: choices must be distinct`);
    assert.ok(challenge.choices.includes(challenge.answer), `seed ${seed}`);
    assert.ok(challenge.choices.every((c) => c > 0), `seed ${seed}: no nonsense choices`);
  }
});

test('the answer is not findable by always picking the largest or smallest', () => {
  let largestWins = 0;
  let smallestWins = 0;
  const trials = 400;

  for (let seed = 0; seed < trials; seed++) {
    const { choices, answer } = createChallenge(seededRng(seed));
    if (Math.max(...choices) === answer) largestWins++;
    if (Math.min(...choices) === answer) smallestWins++;
  }

  // A pure guessing strategy should stay near chance, well short of reliable.
  assert.ok(largestWins / trials < 0.5, `largest-wins rate ${largestWins / trials}`);
  assert.ok(smallestWins / trials < 0.5, `smallest-wins rate ${smallestWins / trials}`);
});

test('the challenge stays beyond an early-primary arithmetic level', () => {
  for (let seed = 0; seed < 200; seed++) {
    const { answer } = createChallenge(seededRng(seed));
    assert.ok(answer >= 4 * 41, `seed ${seed}: answer ${answer} is too easy`);
  }
});

test('only the correct answer passes', () => {
  const challenge = createChallenge(seededRng(7));
  assert.equal(isCorrect(challenge, challenge.answer), true);
  for (const choice of challenge.choices) {
    if (choice !== challenge.answer) assert.equal(isCorrect(challenge, choice), false);
  }
});

test('a passed gate expires and re-locks', () => {
  const passedAt = 1_000_000;
  assert.equal(isGateStillOpen(passedAt, passedAt), true);
  assert.equal(isGateStillOpen(passedAt, passedAt + GATE_SESSION_MS - 1), true);
  assert.equal(isGateStillOpen(passedAt, passedAt + GATE_SESSION_MS), false);
});

test('a gate never opened is closed, and a backwards clock closes it', () => {
  assert.equal(isGateStillOpen(null, Date.now()), false);
  assert.equal(isGateStillOpen(1_000_000, 999_999), false);
});
