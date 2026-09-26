import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DEFAULT_SETTINGS, togglePinned, type Settings } from '../src/state/settings.ts';

test('a fresh profile starts with no pinned games', () => {
  assert.deepEqual(DEFAULT_SETTINGS.pinnedGameIds, []);
});

test('togglePinned pins an unpinned game, appending it', () => {
  const next = togglePinned(DEFAULT_SETTINGS, 'sudoku');
  assert.deepEqual(next.pinnedGameIds, ['sudoku']);
  // Nothing else about settings should change.
  assert.equal(next.soundOn, DEFAULT_SETTINGS.soundOn);
});

test('togglePinned unpins an already-pinned game', () => {
  const pinned = { ...DEFAULT_SETTINGS, pinnedGameIds: ['sudoku', 'memory'] };
  const next = togglePinned(pinned, 'sudoku');
  assert.deepEqual(next.pinnedGameIds, ['memory']);
});

test('pinning preserves the order games were pinned in', () => {
  let settings = DEFAULT_SETTINGS;
  settings = togglePinned(settings, 'memory');
  settings = togglePinned(settings, 'sudoku');
  settings = togglePinned(settings, 'wordbuilder');
  assert.deepEqual(settings.pinnedGameIds, ['memory', 'sudoku', 'wordbuilder']);
});

test('unpinning and re-pinning moves a game to the end', () => {
  let settings: Settings = { ...DEFAULT_SETTINGS, pinnedGameIds: ['memory', 'sudoku'] };
  settings = togglePinned(settings, 'memory');
  settings = togglePinned(settings, 'memory');
  assert.deepEqual(settings.pinnedGameIds, ['sudoku', 'memory']);
});
