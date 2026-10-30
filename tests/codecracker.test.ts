import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng, type Rng } from '../src/util/random.ts';
import {
  MAX_GUESSES,
  add,
  check,
  createGame,
  score,
  specForLevel,
  starsForCode,
  undo,
  type CodeCrackerState,
} from '../src/games/codecracker/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];

function allCodes(length: number, symbols: number, repeats: boolean): number[][] {
  let out: number[][] = [[]];
  for (let i = 0; i < length; i += 1) {
    out = out.flatMap((c) =>
      Array.from({ length: symbols }, (_, s) => s)
        .filter((s) => repeats || !c.includes(s))
        .map((s) => [...c, s]),
    );
  }
  return out;
}

/** A thoughtful player: every guess is one that fits everything learned so
 *  far — the marks under each shape where they're shown, the counts where
 *  they aren't. */
function playConsistently(start: CodeCrackerState, rng: Rng): CodeCrackerState {
  let s = start;
  let pool = allCodes(s.length, s.symbols, s.repeats);
  while (!s.complete) {
    const guess = pool[Math.floor(rng() * pool.length)];
    for (const g of guess) s = add(s, g);
    s = check(s);
    const last = s.guesses[s.guesses.length - 1];
    pool = pool.filter((c) => {
      const r = score(c, guess);
      return s.perSlot ? r.marks.join() === last.marks.join() : r.exact === last.exact && r.near === last.near;
    });
  }
  return s;
}

test('the code is the level\'s length, from the level\'s shapes, with repeats only where allowed', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    for (let seed = 0; seed < 100; seed += 1) {
      const s = createGame(seededRng(seed * 7 + level), level);
      assert.equal(s.code.length, spec.length);
      assert.ok(s.code.every((c) => c >= 0 && c < spec.symbols));
      if (!spec.repeats) assert.equal(new Set(s.code).size, s.code.length);
    }
  }
});

test('scoring never counts a shape twice', () => {
  assert.deepEqual(score([0, 1, 2], [0, 1, 2]).exact, 3);
  assert.deepEqual(score([0, 1, 2], [2, 0, 1]), { exact: 0, near: 3, marks: ['elsewhere', 'elsewhere', 'elsewhere'] });
  // One 0 in the code: a guess of three 0s gets one peg, not three.
  assert.deepEqual(score([0, 1, 2], [0, 0, 0]), { exact: 1, near: 0, marks: ['here', 'none', 'none'] });
  assert.deepEqual(score([0, 1, 2], [3, 0, 0]), { exact: 0, near: 1, marks: ['none', 'elsewhere', 'none'] });
  assert.deepEqual(score([1, 1, 2, 3], [1, 2, 1, 1]), { exact: 1, near: 2, marks: ['here', 'elsewhere', 'elsewhere', 'none'] });
});

test('a thoughtful player cracks it within ten every time, and within par nearly always', () => {
  for (const level of LEVELS) {
    let withinPar = 0;
    const runs = 120;
    for (let seed = 0; seed < runs; seed += 1) {
      const s = playConsistently(createGame(seededRng(seed + 1000 * level), level), seededRng(seed * 31 + level));
      assert.equal(s.cracked, true, `level ${level}, seed ${seed}: not cracked in ${MAX_GUESSES}`);
      if (starsForCode(s) === 3) withinPar += 1;
    }
    assert.ok(withinPar / runs >= 0.9, `level ${level}: only ${withinPar} of ${runs} within par`);
  }
});

test('ten guesses and the round is over, cracked or not', () => {
  let s = createGame(seededRng(3), 4);
  const wrong = [0, 1, 2, 3].map((i) => (s.code.includes(i) ? i : i)).slice(0, s.length);
  for (let g = 0; g < MAX_GUESSES && !s.complete; g += 1) {
    let guess = wrong;
    if (guess.join() === s.code.join()) guess = [...guess].reverse();
    for (const x of guess) s = add(s, x);
    s = check(s);
  }
  if (!s.cracked) {
    assert.equal(s.complete, true);
    assert.equal(s.guesses.length, MAX_GUESSES);
    assert.equal(starsForCode(s), 1, 'never none');
  }
  assert.equal(check(add(s, 0)), add(s, 0), 'nothing more once it is over');
});

test('a guess can only be checked when it is full, and the last shape can be taken back', () => {
  let s = createGame(seededRng(4), 2);
  s = add(s, 0);
  assert.equal(check(s), s, 'not full yet');
  s = add(add(s, 1), 2);
  assert.equal(add(s, 3).current.length, 3, 'no more than the code is long');
  assert.deepEqual(undo(s).current, [0, 1]);
  assert.equal(add(s, 99), s, 'not a shape on offer');
});
