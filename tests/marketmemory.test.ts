import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import { starsForMistakes } from '../src/games/types.ts';
import { createGame, pickItem, specForLevel, stopPeeking, type MarketMemoryState } from '../src/games/marketmemory/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];

/** A team that remembers perfectly, and adds whatever's first on the shelf. */
function playPerfectly(start: MarketMemoryState, rngSeed: number): MarketMemoryState {
  const rng = seededRng(rngSeed);
  let s = start;
  for (let guard = 0; guard < 1000 && !s.complete; guard += 1) {
    s = pickItem(s, s.phase === 'recall' ? s.bag[s.recalled] : s.shelf[guard % s.shelf.length], rng);
  }
  return s;
}

test('the shelf has the level\'s number of things, no two alike in shape and box', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    for (let seed = 0; seed < 30; seed += 1) {
      const s = createGame(seededRng(seed + level * 50), level, 3);
      assert.equal(s.items.length, spec.shelf);
      assert.equal(new Set(s.items.map((i) => `${i.shape}:${i.boxed}`)).size, spec.shelf);
      assert.deepEqual([...s.shelf].sort((a, b) => a - b), s.items.map((_, i) => i));
      for (const twin of s.items.filter((i) => i.boxed)) {
        const plain = s.items.find((i) => !i.boxed && i.shape === twin.shape)!;
        if (spec.twins) assert.equal(twin.color, plain.color, 'twins look alike at the top');
        else assert.notEqual(twin.color, plain.color, 'twins are told apart by colour too, lower down');
      }
    }
  }
});

test('a team that remembers fills the bag to the target with no slips, turns going round', () => {
  for (const level of LEVELS) {
    for (const players of [2, 3, 5]) {
      const s = playPerfectly(createGame(seededRng(level * 7 + players), level, players), level);
      assert.equal(s.complete, true);
      assert.equal(s.bag.length, specForLevel(level).target);
      assert.equal(s.mistakes, 0);
      assert.equal(starsForMistakes(s.mistakes), 3);
    }
  }
});

test('the first player just adds; each next player recalls the bag in order, then adds', () => {
  const rng = seededRng(1);
  let s = createGame(seededRng(2), 2, 3);
  assert.equal(s.phase, 'add');
  s = pickItem(s, 4, rng);
  assert.deepEqual(s.bag, [4]);
  assert.equal(s.turn, 1);
  assert.equal(s.phase, 'recall');
  s = pickItem(s, 4, rng);
  assert.equal(s.phase, 'add');
  s = pickItem(s, 2, rng);
  assert.deepEqual(s.bag, [4, 2]);
  assert.equal(s.turn, 2);
  s = pickItem(s, 4, rng);
  s = pickItem(s, 2, rng);
  s = pickItem(s, 0, rng);
  assert.equal(s.turn, 0, 'round the group and back to the first player');
});

test('a slip shows the bag and costs one; the player carries on from where they were', () => {
  const rng = seededRng(3);
  let s = createGame(seededRng(4), 3, 2);
  s = pickItem(s, 0, rng);
  s = pickItem(pickItem(s, 0, rng), 1, rng); // bag: 0, 1
  s = pickItem(s, 0, rng); // first right
  const slipped = pickItem(s, 5, rng);
  assert.equal(slipped.mistakes, 1);
  assert.equal(slipped.peeking, true);
  assert.equal(pickItem(slipped, 1, rng), slipped, 'nothing is picked while the bag is on show');
  const going = stopPeeking(slipped);
  assert.equal(going.recalled, 1, 'still one in, not back to the start');
  assert.equal(pickItem(going, 1, rng).phase, 'add');
});

test('from level 4 the shelf is shuffled between turns', () => {
  const rng = seededRng(5);
  let moved = 0;
  for (let seed = 0; seed < 20; seed += 1) {
    const s = createGame(seededRng(seed), 4, 2);
    if (pickItem(s, 0, rng).shelf.join() !== s.shelf.join()) moved += 1;
  }
  assert.ok(moved >= 18);
  const low = createGame(seededRng(6), 3, 2);
  assert.equal(pickItem(low, 0, rng).shelf.join(), low.shelf.join());
});
