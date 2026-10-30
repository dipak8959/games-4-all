import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import { starsForMistakes } from '../src/games/types.ts';
import {
  ECHOES_PER_ROUND,
  MAX_GAP,
  MIN_GAP,
  TRIES_PER_BEAT,
  copier,
  createGame,
  matches,
  shown,
  specForLevel,
  tapDrum,
  toPattern,
  type EchoBeatState,
} from '../src/games/echobeat/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];

function tapAll(s: EchoBeatState, times: readonly number[]): EchoBeatState {
  let next = s;
  for (const t of times) next = tapDrum(next, t);
  return next;
}

test('a beat keeps its gaps, within reach', () => {
  assert.deepEqual(toPattern([1000, 1300, 1900]), [0, 300, 900]);
  assert.deepEqual(toPattern([0, 10, 5000]), [0, MIN_GAP, MIN_GAP + MAX_GAP]);
});

test('a copy matches when every gap is near enough, and not otherwise', () => {
  const beat = [0, 400, 600, 1200];
  assert.equal(matches(beat, [0, 420, 610, 1190], 0.2), true);
  assert.equal(matches(beat, [0, 600, 800, 1400], 0.2), false, 'the first gap half as long again');
  assert.equal(matches(beat, [0, 400, 600], 0.2), false, 'a beat short');
  assert.equal(matches([0, 150, 300], [0, 230, 380], 0.2), true, 'short gaps get a fixed slack');
});

test('make, show, copy, and the copier makes the next — turns going round', () => {
  const rng = seededRng(1);
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    let s = createGame(level, 3);
    const makers: number[] = [];
    while (!s.complete) {
      assert.equal(s.phase, 'make');
      makers.push(s.maker);
      const times = [0];
      for (let i = 1; i < spec.beats; i += 1) times.push(times[i - 1] + 200 + Math.floor(rng() * 600));
      s = tapAll(s, times);
      assert.equal(s.phase, 'show');
      assert.equal(tapDrum(s, 99), s, 'no tapping while the drum plays it back');
      s = shown(s);
      assert.equal(s.phase, 'copy');
      // A copy a little off, as a person's would be.
      s = tapAll(s, times.map((t, i) => 5000 + t + (i ? (rng() - 0.5) * 30 : 0)));
      assert.equal(s.last, 'match');
    }
    assert.equal(s.echoes, ECHOES_PER_ROUND);
    assert.deepEqual(makers, makers.map((_, i) => i % 3));
    assert.equal(starsForMistakes(s.mistakes), 3);
  }
});

test('a copy that is off is shown again, three goes at most, then the team moves on', () => {
  let s = createGame(6, 2);
  s = shown(tapAll(s, [0, 300, 600, 900, 1500, 1800]));
  const who = copier(s);
  for (let t = 1; t <= TRIES_PER_BEAT; t += 1) {
    s = tapAll(s, [0, 100, 900, 1000, 1100, 2500]);
    if (t < TRIES_PER_BEAT) {
      assert.equal(s.last, 'miss');
      assert.equal(s.phase, 'show');
      s = shown(s);
    }
  }
  assert.equal(s.last, 'moved-on');
  assert.equal(s.mistakes, TRIES_PER_BEAT);
  assert.equal(s.echoes, 1);
  assert.equal(s.maker, who, 'still their turn to make the next one');
});

test('the copy gets stricter and the beat longer as the levels rise', () => {
  const beat = [0, 400, 800];
  const copy = [0, 520, 920];
  assert.equal(matches(beat, copy, specForLevel(1).tolerance), true);
  assert.equal(matches(beat, copy, specForLevel(6).tolerance), false);
  assert.ok(specForLevel(6).beats > specForLevel(1).beats);
});
