import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import { starsForMistakes } from '../src/games/types.ts';
import { SHOWN, STRINGS, choose, createGame, same, specForLevel, stringNow } from '../src/games/beadpattern/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];

/** Works out the pattern by eye: the shortest repeat that fits the beads
 *  shown, and what it says comes next. */
function nextByEye(beads: readonly { shape: string; color: string }[], at: number) {
  for (let period = 1; period <= SHOWN / 2; period += 1) {
    if (beads.slice(0, SHOWN).every((b, i) => i < period || (b.shape === beads[i - period].shape && b.color === beads[i - period].color))) {
      return beads[at - period * Math.ceil((at - SHOWN + 1) / period)];
    }
  }
  throw new Error('no pattern');
}

test('a child who reads the pattern threads every bead first time', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < 20; seed += 1) {
      let s = createGame(seededRng(seed * 11 + level), level);
      while (!s.complete) {
        const str = stringNow(s);
        const want = nextByEye(str.beads, SHOWN + s.threaded);
        const i = str.choices.findIndex((c) => same(c, want as never));
        assert.ok(i >= 0, `level ${level}: the bead that comes next is not offered`);
        s = choose(s, i);
      }
      assert.equal(s.mistakes, 0);
      assert.equal(starsForMistakes(s.mistakes), 3);
    }
  }
});

test('the shown beads repeat a unit, choices are all different, and look-alikes share a colour', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    const s = createGame(seededRng(level), level);
    assert.equal(s.strings.length, STRINGS);
    for (const str of s.strings) {
      assert.equal(str.beads.length, SHOWN + spec.missing);
      assert.equal(str.choices.length, spec.choices);
      for (let i = 0; i < str.choices.length; i += 1) for (let j = i + 1; j < str.choices.length; j += 1) assert.ok(!same(str.choices[i], str.choices[j]));
      for (const needed of str.beads.slice(SHOWN)) assert.ok(str.choices.some((c) => same(c, needed)));
      if (spec.lookAlike) assert.equal(new Set(str.choices.map((c) => c.color)).size, 1);
      else assert.equal(new Set(str.choices.map((c) => c.shape)).size, str.choices.length, 'shape tells every choice apart');
    }
  }
});

test('a wrong bead is ruled out, and two gaps are filled one at a time', () => {
  let s = createGame(seededRng(4), 5);
  const str = stringNow(s);
  const wrong = str.choices.findIndex((c) => !same(c, str.beads[SHOWN]));
  s = choose(s, wrong);
  assert.equal(s.mistakes, 1);
  assert.deepEqual(s.ruledOut, [wrong]);
  s = choose(s, str.choices.findIndex((c) => same(c, str.beads[SHOWN])));
  assert.equal(s.threaded, 1);
  assert.equal(s.index, 0);
  s = choose(s, str.choices.findIndex((c) => same(c, str.beads[SHOWN + 1])));
  assert.equal(s.index, 1);
});
