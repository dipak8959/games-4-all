import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng, type Rng } from '../src/util/random.ts';
import {
  BUBBLE,
  TARGETS,
  bubbleAt,
  createGame,
  makes,
  needs,
  reachable,
  specForLevel,
  starsForSlips,
  step,
  tapBubble,
  type NumberBubblesState,
} from '../src/games/numberbubbles/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];
const DT = 1 / 30;

/** A set of bubbles on the screen that makes the target, if there is one. */
function answer(s: NumberBubblesState, onlyReachable = true): number[] | null {
  const pool = s.bubbles.filter((b) => !b.hidden && (!onlyReachable || reachable(s, b)));
  const size = needs(s.kind);
  const find = (from: number, chosen: typeof pool): typeof pool | null => {
    if (chosen.length === size) return makes(s.kind, chosen.map((b) => b.value)) === s.target ? chosen : null;
    for (let i = from; i < pool.length; i += 1) {
      const got = find(i + 1, [...chosen, pool[i]]);
      if (got) return got;
    }
    return null;
  };
  return find(0, [])?.map((b) => b.id) ?? null;
}

function play(initial: NumberBubblesState, rng: Rng, choose: (s: NumberBubblesState) => number[] | null, limit = 300) {
  let s = initial;
  for (let t = 0; t < limit && !s.complete; t += DT) {
    const ids = choose(s);
    if (ids) for (const id of ids) s = tapBubble(s, id, rng);
    s = step(s, DT);
  }
  return s;
}

test('a careful player, waiting for the right bubbles to be in reach, makes every target first time', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < 30; seed += 1) {
      const rng = seededRng(seed * 37 + level);
      const s = play(createGame(rng, level), rng, (x) => answer(x));
      assert.equal(s.complete, true, `level ${level}, seed ${seed}: made ${s.made}`);
      assert.equal(s.made, TARGETS);
      assert.equal(s.slips, 0);
      assert.equal(starsForSlips(s.slips), 3);
    }
  }
});

test('every target can be made from the bubbles there are, and is within the level', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    for (let seed = 0; seed < 20; seed += 1) {
      const rng = seededRng(seed + level * 3);
      let s = createGame(rng, level);
      for (let n = 0; n < TARGETS && !s.complete; n += 1) {
        assert.ok(s.target >= 1 && s.target <= spec.most, `level ${level}: target ${s.target}`);
        // On the screen now, or once the new ones have come round.
        let ids = answer(s, false);
        for (let t = 0; !ids && t < 60; t += DT) {
          s = step(s, DT);
          ids = answer(s, false);
        }
        assert.ok(ids, `level ${level}: no bubbles make ${s.target}`);
        for (const id of ids) s = tapBubble(s, id, rng);
      }
      assert.equal(s.complete, true, `level ${level}, seed ${seed}: made ${s.made}, slips ${s.slips}, picked ${s.picked.length}`);
    }
  }
});

test('tapping at random still gets there', () => {
  for (const level of LEVELS) {
    const rng = seededRng(level * 13);
    const s = play(createGame(rng, level), rng, (x) => {
      if (rng() > 0.2) return null;
      const on = x.bubbles.filter((b) => reachable(x, b));
      return on.length ? [on[Math.floor(rng() * on.length)].id] : null;
    }, 3000);
    assert.equal(s.complete, true, `level ${level}: made ${s.made}`);
  }
});

test('going over the target is one slip, and the picks float free', () => {
  let checked = 0;
  for (let seed = 0; seed < 20; seed += 1) {
    const rng = seededRng(seed);
    let s = createGame(rng, 2);
    // One under the target, then one that takes it over.
    const first = s.bubbles.find((b) => b.value < s.target);
    const second = first && s.bubbles.find((b) => b.id !== first.id && first.value + b.value > s.target);
    if (!first || !second) continue;
    s = tapBubble(s, first.id, rng);
    assert.deepEqual(s.picked, [first.id]);
    s = tapBubble(s, second.id, rng);
    assert.equal(s.slips, 1);
    assert.deepEqual(s.picked, []);
    assert.equal(s.said, 'over');
    checked += 1;
  }
  assert.ok(checked > 5);
});

test('a bubble tapped again is let go, with no slip', () => {
  const rng = seededRng(6);
  let s = createGame(rng, 3);
  const id = s.bubbles[0].id;
  s = tapBubble(s, id, rng);
  assert.deepEqual(s.picked, s.bubbles[0].value > s.target ? [] : [id]);
  if (s.picked.length) {
    s = tapBubble(s, id, rng);
    assert.deepEqual(s.picked, []);
    assert.equal(s.slips, 0);
  }
});

test('bubbles in a column never overlap, even after some have popped', () => {
  for (const level of LEVELS) {
    const rng = seededRng(level);
    let s = createGame(rng, level);
    for (let i = 0; i < 3000 && !s.complete; i += 1) {
      // Pop whatever makes the target now and then, as a player would.
      if (i % 40 === 0) {
        const ids = answer(s);
        if (ids) for (const id of ids) s = tapBubble(s, id, rng);
      }
      const shown = s.bubbles.filter((b) => !b.hidden);
      for (const a of shown) {
        for (const b of shown) {
          if (a.id < b.id && a.column === b.column) {
            const [p, q] = [bubbleAt(s, a), bubbleAt(s, b)];
            assert.ok(Math.abs(p.y - q.y) >= BUBBLE * 2 - 1 || Math.abs(p.y - q.y) > 400, `level ${level}: bubbles overlapping`);
          }
        }
      }
      s = step(s, DT);
    }
    assert.ok(s.made > 0, `level ${level}: nothing popped`);
  }
});

test('a popped bubble\'s place stays empty until it comes up from the bottom again', () => {
  const rng = seededRng(4);
  let s = createGame(rng, 1);
  let ids = answer(s, false);
  for (let t = 0; !ids && t < 60; t += DT) {
    s = step(s, DT);
    ids = answer(s, false);
  }
  assert.ok(ids);
  for (const id of ids) s = tapBubble(s, id, rng);
  const fresh = s.bubbles.filter((b) => b.hidden);
  assert.equal(fresh.length, ids.length);
  // Hidden bubbles can't be tapped.
  const before = s;
  s = tapBubble(s, fresh[0].id, rng);
  assert.deepEqual(s.picked, before.picked);
  // Round they come, and show from below the field.
  for (let t = 0; s.bubbles.some((b) => b.hidden) && t < 60; t += DT) {
    const was = s.bubbles.filter((b) => b.hidden).map((b) => b.id);
    s = step(s, DT);
    for (const b of s.bubbles) if (was.includes(b.id) && !b.hidden) assert.ok(bubbleAt(s, b).y > 480 + BUBBLE / 2, 'showed on the screen');
  }
  assert.equal(s.bubbles.some((b) => b.hidden), false);
});
