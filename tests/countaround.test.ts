import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import { starsForMistakes } from '../src/games/types.ts';
import { createGame, key, say, specForLevel, whatToSay } from '../src/games/countaround/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];

test('what to say: the number, or CLAP, STOMP or BOTH on the multiples', () => {
  assert.equal(whatToSay(7, []), 7);
  assert.equal(whatToSay(10, [5]), 'clap');
  assert.equal(whatToSay(9, [3, 5]), 'clap');
  assert.equal(whatToSay(10, [3, 5]), 'stomp');
  assert.equal(whatToSay(15, [3, 5]), 'both');
  assert.equal(whatToSay(16, [3, 5]), 16);
});

test('a team that knows its multiples counts all the way with no slips, turns going round', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    const rng = seededRng(level);
    let s = createGame(seededRng(level + 10), level, 3);
    let turns = 0;
    while (!s.complete) {
      assert.equal(s.turn, turns % 3);
      const right = whatToSay(s.n, s.rules);
      if (typeof right === 'number') assert.ok(s.numbers.includes(right), 'the right number is on offer');
      s = say(s, right, rng);
      turns += 1;
    }
    assert.equal(turns, spec.to);
    assert.equal(s.mistakes, 0);
    assert.equal(starsForMistakes(s.mistakes), 3);
  }
});

test('on a clap number, the number itself is on offer — and is a slip', () => {
  const rng = seededRng(2);
  let s = createGame(seededRng(3), 3, 2);
  while (s.n < 5) s = say(s, whatToSay(s.n, s.rules), rng);
  assert.equal(s.n, 5);
  assert.ok(s.numbers.includes(5));
  const slipped = say(s, 5, rng);
  assert.equal(slipped.mistakes, 1);
  assert.equal(slipped.n, 5, 'still on five');
  assert.equal(slipped.turn, s.turn, 'the same player tries again');
  assert.equal(say(slipped, 5, rng), slipped, 'a dimmed choice is not charged twice');
  assert.equal(say(slipped, 'clap', rng).n, 6);
});

test('every turn offers three different numbers near the count', () => {
  for (const level of LEVELS) {
    const rng = seededRng(level * 3);
    let s = createGame(seededRng(level), level, 4);
    while (!s.complete) {
      assert.equal(new Set(s.numbers).size, 3);
      assert.ok(s.numbers.every((x) => x >= 1 && Math.abs(x - s.n) <= 2));
      s = say(s, whatToSay(s.n, s.rules), rng);
    }
  }
});

test('the rules only arrive from level 3, and the count gets longer', () => {
  assert.deepEqual(LEVELS.map((l) => specForLevel(l).rules.length), [0, 0, 1, 1, 2, 2]);
  assert.equal(key('clap'), 'clap');
  assert.equal(key(12), '12');
});
