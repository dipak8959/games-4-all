import assert from 'node:assert/strict';
import { test } from 'node:test';

import { clampLevel, MAX_LEVEL, MIN_LEVEL, nextLevel, startingLevelForAge } from '../src/games/types.ts';
import { EMPTY_PROGRESS, progressFor, recordRound } from '../src/state/progress.ts';
import { MAX_AGE, MIN_AGE } from '../src/state/profiles.ts';

// --- pure step function ------------------------------------------------------

test('a perfect round (3 stars) steps the level up by exactly one', () => {
  assert.equal(nextLevel(2, 3), 3);
});

test('a rough round (1 star) steps the level down by exactly one', () => {
  assert.equal(nextLevel(3, 1), 2);
});

test('a middling round (2 stars) holds the level steady', () => {
  assert.equal(nextLevel(3, 2), 3);
});

test('the level never rises above MAX_LEVEL', () => {
  assert.equal(nextLevel(MAX_LEVEL, 3), MAX_LEVEL);
});

test('the level never drops below MIN_LEVEL', () => {
  assert.equal(nextLevel(MIN_LEVEL, 1), MIN_LEVEL);
});

test('a single round never moves the level by more than one step', () => {
  for (let level = MIN_LEVEL; level <= MAX_LEVEL; level++) {
    for (const stars of [1, 2, 3]) {
      const next = nextLevel(level, stars);
      assert.ok(Math.abs(next - level) <= 1, `level ${level}, stars ${stars} -> ${next}`);
    }
  }
});

test('clampLevel confines out-of-range values to [MIN_LEVEL, MAX_LEVEL]', () => {
  assert.equal(clampLevel(-5), MIN_LEVEL);
  assert.equal(clampLevel(0), MIN_LEVEL);
  assert.equal(clampLevel(999), MAX_LEVEL);
  assert.equal(clampLevel(3), 3);
});

// --- age-seeded starting level -----------------------------------------------

test('startingLevelForAge always returns a level inside the adaptive range', () => {
  for (let age = MIN_AGE; age <= MAX_AGE; age++) {
    const level = startingLevelForAge(age);
    assert.ok(level >= MIN_LEVEL && level <= MAX_LEVEL, `age ${age} -> level ${level}`);
    assert.equal(level, Math.round(level), `age ${age} -> non-integer level ${level}`);
  }
});

test('startingLevelForAge never goes down as age goes up', () => {
  for (let age = MIN_AGE; age < MAX_AGE; age++) {
    assert.ok(
      startingLevelForAge(age + 1) >= startingLevelForAge(age),
      `age ${age + 1} starts easier than age ${age}`,
    );
  }
});

test('a young child starts near the bottom of the range', () => {
  assert.equal(startingLevelForAge(3), 1);
  assert.equal(startingLevelForAge(4), 1);
  assert.equal(startingLevelForAge(6), 2);
});

test('an adult starts at the top rather than warming up on the easiest content', () => {
  // The whole point: a grown-up opening Number Crunch should not be asked
  // single-digit addition for several rounds before the game gets real.
  assert.equal(startingLevelForAge(41), MAX_LEVEL);
  assert.equal(startingLevelForAge(16), MAX_LEVEL);
  assert.equal(startingLevelForAge(MAX_AGE), MAX_LEVEL);
});

test('school-age players land in the middle of the range', () => {
  assert.equal(startingLevelForAge(8), 3);
  assert.equal(startingLevelForAge(10), 4);
  assert.equal(startingLevelForAge(13), 5);
});

// --- persisted adaptive level via progress.recordRound -----------------------

test('a new game has no adaptive level yet, so the age-seeded starting level applies', () => {
  assert.equal(progressFor(EMPTY_PROGRESS, 'memory').currentLevel, null);
});

test('recording a round persists the next adaptive level for that game only', () => {
  const progress = recordRound(EMPTY_PROGRESS, 'memory', { stars: 3, level: 2 });
  assert.equal(progressFor(progress, 'memory').currentLevel, 3);
  assert.equal(progressFor(progress, 'counting').currentLevel, null);
});

test('adaptive level tracks across consecutive rounds independent of bestLevel', () => {
  let progress = recordRound(EMPTY_PROGRESS, 'shapes', { stars: 3, level: 4 });
  progress = recordRound(progress, 'shapes', { stars: 1, level: 5 });
  // Went up to 5, then a rough round at level 5 drops it back to 4.
  assert.equal(progressFor(progress, 'shapes').currentLevel, 4);
  // bestLevel still remembers the highest level actually completed.
  assert.equal(progressFor(progress, 'shapes').bestLevel, 5);
});
