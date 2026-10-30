import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import { starsForMistakes } from '../src/games/types.ts';
import {
  CLOCKS_PER_ROUND,
  choose,
  createGame,
  formatTime,
  handAngles,
  specForLevel,
} from '../src/games/clocktime/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];

test('times are written the way a clock is read', () => {
  assert.equal(formatTime(3, 0), '3:00');
  assert.equal(formatTime(12, 5), '12:05');
  assert.equal(formatTime(0, 30), '12:30');
  assert.equal(formatTime(13, 45), '1:45');
});

test('the hour hand moves on between the numbers as the minutes pass', () => {
  assert.deepEqual(handAngles(3, 0), { hour: 90, minute: 0 });
  assert.deepEqual(handAngles(3, 30), { hour: 105, minute: 180 });
  assert.equal(handAngles(2, 50).hour, 85, 'ten to three: nearly on the 3');
  assert.equal(handAngles(12, 15).hour, 7.5);
});

test('every clock offers the level\'s number of different times, exactly one of them right', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    for (let seed = 0; seed < 80; seed += 1) {
      const s = createGame(seededRng(seed * 11 + level), level);
      assert.equal(s.clocks.length, CLOCKS_PER_ROUND);
      const shown = new Set<string>();
      for (const c of s.clocks) {
        assert.equal(c.choices.length, spec.choices);
        assert.equal(new Set(c.choices).size, c.choices.length, 'two choices the same');
        assert.equal(c.choices[c.answer], formatTime(c.hour, c.minute));
        assert.equal(c.choices.filter((x) => x === formatTime(c.hour, c.minute)).length, 1);
        if (!spec.trap) assert.equal(c.minute % spec.step, 0, `level ${level}: ${c.minute} is off the level's step`);
        assert.ok(c.hour >= 1 && c.hour <= 12 && c.minute >= 0 && c.minute < 60);
        shown.add(formatTime(c.hour, c.minute));
      }
      assert.ok(shown.size >= CLOCKS_PER_ROUND - 1, 'the same clock over and over');
    }
  }
});

test('o\'clock first, then half past, then quarters, then any minute', () => {
  const minutes = (level: number) => {
    const set = new Set<number>();
    for (let seed = 0; seed < 60; seed += 1) for (const c of createGame(seededRng(seed), level).clocks) set.add(c.minute);
    return set;
  };
  assert.deepEqual([...minutes(1)], [0]);
  assert.deepEqual([...minutes(2)].sort((a, b) => a - b), [0, 30]);
  assert.deepEqual([...minutes(3)].sort((a, b) => a - b), [0, 15, 30, 45]);
  assert.ok([...minutes(5)].some((m) => m % 5 !== 0), 'any minute at level 5');
});

test('at the top, "nearly the next hour" is among the choices when the clock is near it', () => {
  let trapped = 0;
  let late = 0;
  for (let seed = 0; seed < 60; seed += 1) {
    for (const c of createGame(seededRng(seed), 6).clocks) {
      if (c.minute < 35) continue;
      late += 1;
      if (c.choices.includes(formatTime(c.hour + 1, c.minute))) trapped += 1;
    }
  }
  assert.ok(late > 50);
  assert.equal(trapped, late);
});

test('a wrong time is ruled out and costs one; the right one moves on; ten ends it', () => {
  let s = createGame(seededRng(3), 3);
  const c = s.clocks[0];
  const wrong = c.choices.findIndex((_, i) => i !== c.answer);
  s = choose(s, wrong);
  assert.equal(s.mistakes, 1);
  assert.deepEqual(s.ruledOut, [wrong]);
  assert.equal(choose(s, wrong), s, 'a ruled-out time is not charged twice');
  s = choose(s, c.answer);
  assert.equal(s.index, 1);
  assert.deepEqual(s.ruledOut, []);
  while (!s.complete) s = choose(s, s.clocks[s.index].answer);
  assert.equal(s.index, CLOCKS_PER_ROUND);
  assert.equal(starsForMistakes(s.mistakes), 2);
});
