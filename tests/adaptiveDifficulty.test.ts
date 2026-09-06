import assert from 'node:assert/strict';
import { test } from 'node:test';

import { clampLevel, MAX_LEVEL, MIN_LEVEL, nextLevel } from '../src/games/types.ts';
import { EMPTY_PROGRESS, progressFor, recordRound } from '../src/state/progress.ts';

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

// --- persisted adaptive level via progress.recordRound -----------------------

test('a new game has no adaptive level yet, so the parent-chosen starting level applies', () => {
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
