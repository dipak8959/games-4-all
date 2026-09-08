import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import {
  createGame,
  sequenceLengthForLevel,
  startInput,
  tapTile,
  tileCountForLevel,
} from '../src/games/patternplay/logic.ts';

test('tile count grows with level: 4, then 6, then 9', () => {
  assert.equal(tileCountForLevel(1), 4);
  assert.equal(tileCountForLevel(2), 4);
  assert.equal(tileCountForLevel(3), 6);
  assert.equal(tileCountForLevel(4), 6);
  assert.equal(tileCountForLevel(5), 9);
  assert.equal(tileCountForLevel(6), 9);
});

test('sequence length grows from 3 to 8 across the level range', () => {
  assert.equal(sequenceLengthForLevel(1), 3);
  assert.equal(sequenceLengthForLevel(2), 4);
  assert.equal(sequenceLengthForLevel(3), 5);
  assert.equal(sequenceLengthForLevel(4), 6);
  assert.equal(sequenceLengthForLevel(5), 7);
  assert.equal(sequenceLengthForLevel(6), 8);
});

test('a fresh game starts revealing, with zero mistakes and not complete', () => {
  const state = createGame(seededRng(1), 3);
  assert.equal(state.revealing, true);
  assert.equal(state.inputIndex, 0);
  assert.equal(state.mistakes, 0);
  assert.equal(state.complete, false);
  assert.equal(state.sequence.length, sequenceLengthForLevel(3));
  assert.ok(state.sequence.every((i) => i >= 0 && i < state.tileCount));
});

test('taps during the reveal phase are ignored', () => {
  const state = createGame(seededRng(2), 1);
  const next = tapTile(state, state.sequence[0]);
  assert.deepEqual(next, state);
});

test('tapping the correct tile in order advances inputIndex', () => {
  let state = startInput(createGame(seededRng(3), 1));
  for (let i = 0; i < state.sequence.length; i++) {
    const before = state;
    state = tapTile(state, state.sequence[i]);
    assert.equal(state.inputIndex, i + 1);
    assert.equal(state.mistakes, before.mistakes);
  }
  assert.equal(state.complete, true);
});

test('tapping the wrong tile costs a mistake and does not advance', () => {
  let state = startInput(createGame(seededRng(4), 1));
  const expected = state.sequence[0];
  const wrong = expected === 0 ? 1 : 0;

  state = tapTile(state, wrong);
  assert.equal(state.mistakes, 1);
  assert.equal(state.inputIndex, 0, 'a wrong tap must not advance the sequence');
  assert.equal(state.complete, false);

  // The child can still recover by tapping the right tile next.
  state = tapTile(state, expected);
  assert.equal(state.inputIndex, 1);
});

test('nothing can be tapped further once the sequence is complete', () => {
  let state = startInput(createGame(seededRng(5), 1));
  for (const tile of state.sequence) {
    state = tapTile(state, tile);
  }
  assert.equal(state.complete, true);

  const after = tapTile(state, state.sequence[0]);
  assert.deepEqual(after, state);
});

test('startInput only ever flips revealing, nothing else', () => {
  const state = createGame(seededRng(6), 2);
  const revealed = startInput(state);
  assert.deepEqual(revealed, { ...state, revealing: false });
});
