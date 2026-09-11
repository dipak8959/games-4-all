import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

import { seededRng } from '../src/util/random.ts';
import {
  createGame,
  sequenceLengthForLevel,
  startInput,
  tapTile,
  tileCountForLevel,
} from '../src/games/patternplay/logic.ts';
import { markFor, MARK_COUNT } from '../src/games/patternplay/marks.ts';
import { MAX_LEVEL, MIN_LEVEL } from '../src/games/types.ts';

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

test('there is a distinct mark for every tile the hardest level puts on the board', () => {
  // Two tiles wearing the same face would make a sequence ambiguous — you
  // could repeat it back correctly and still be told you were wrong. If a
  // future level raises the tile count, `PatternMark` has to grow with it.
  for (let level = MIN_LEVEL; level <= MAX_LEVEL; level += 1) {
    assert.ok(
      tileCountForLevel(level) <= MARK_COUNT,
      `level ${level} wants ${tileCountForLevel(level)} tiles but only ${MARK_COUNT} marks exist`,
    );
  }

  // And every one of those marks is genuinely its own face.
  const faces = Array.from({ length: MARK_COUNT }, (_, i) => markFor(i));
  assert.equal(new Set(faces).size, MARK_COUNT, 'two tiles would share a mark');
});

/**
 * The two things the screen has to get right that its pure logic cannot
 * express. `PatternPlayScreen.tsx` is JSX, so it can't be imported here — its
 * source is read instead, which is the same trick `theme.test.ts` uses.
 */
const SCREEN = readFileSync('src/games/patternplay/PatternPlayScreen.tsx', 'utf8');

test('the reveal waits for the board to arrive before lighting the first tile', () => {
  // Played from a standing start the first tile lit on the same frame the
  // screen mounted — during the tap that opened the game, and again the
  // instant "Play again" dismissed the round-complete card. Step one was
  // effectively invisible, so a child repeated a sequence they had only seen
  // part of and was told they were wrong.
  const leadIn = SCREEN.match(/const REVEAL_LEAD_IN_MS = (\d+);/);
  assert.ok(leadIn, 'the reveal has no lead-in pause before the first tile');
  assert.ok(
    Number(leadIn[1]) >= 500,
    `a ${leadIn[1]}ms lead-in is not long enough for the board to settle`,
  );
  assert.match(
    SCREEN,
    /const onAt = REVEAL_LEAD_IN_MS \+/,
    'the lead-in is declared but not applied to the reveal timings',
  );
  assert.match(
    SCREEN,
    /const doneAt = REVEAL_LEAD_IN_MS \+/,
    'input would open before the sequence has finished playing',
  );
});

test('a lit tile says it is lit, rather than only looking it', () => {
  // `accessibilityState.selected` is not a valid ARIA state on a button, so
  // react-native-web drops it: on the web build the lit tile was signalled by
  // its accent fill and nothing else, which is exactly the "colour is the
  // only signal" case SAFETY.md rules out.
  assert.match(
    SCREEN,
    /accessibilityLabel=\{`\$\{MARK_LABELS\[mark\]\} tile\$\{lit \? ', lit' : ''\}`\}/,
    'the lit state is missing from the tile\'s accessible name',
  );
});
