import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  EMPTY_PROGRESS,
  progressFor,
  recordRound,
  totalStars,
} from '../src/state/progress.ts';

test('an unplayed game reports a clean slate', () => {
  assert.deepEqual(progressFor(EMPTY_PROGRESS, 'memory'), {
    rounds: 0,
    stars: 0,
    bestLevel: 1,
    currentLevel: null,
  });
});

test('rounds and stars accumulate per game without touching the others', () => {
  let progress = recordRound(EMPTY_PROGRESS, 'memory', { stars: 3, level: 2 });
  progress = recordRound(progress, 'memory', { stars: 1, level: 1 });
  progress = recordRound(progress, 'counting', { stars: 2, level: 1 });

  assert.deepEqual(progressFor(progress, 'memory'), {
    rounds: 2,
    stars: 4,
    bestLevel: 2,
    currentLevel: 1,
  });
  assert.deepEqual(progressFor(progress, 'counting'), {
    rounds: 1,
    stars: 2,
    bestLevel: 1,
    currentLevel: 1,
  });
  assert.equal(totalStars(progress), 6);
});

test('best level only ever moves up, so a child never loses ground', () => {
  let progress = recordRound(EMPTY_PROGRESS, 'shapes', { stars: 3, level: 4 });
  progress = recordRound(progress, 'shapes', { stars: 3, level: 1 });
  assert.equal(progressFor(progress, 'shapes').bestLevel, 4);
});

test('recording a round does not mutate the previous state', () => {
  const before = recordRound(EMPTY_PROGRESS, 'memory', { stars: 2, level: 1 });
  const snapshot = JSON.stringify(before);
  recordRound(before, 'memory', { stars: 3, level: 2 });
  assert.equal(JSON.stringify(before), snapshot);
});

test('a negative star value cannot reduce a running total', () => {
  const progress = recordRound(EMPTY_PROGRESS, 'memory', { stars: -5, level: 1 });
  assert.equal(progressFor(progress, 'memory').stars, 0);
});
