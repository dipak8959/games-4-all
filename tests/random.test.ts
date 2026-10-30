import assert from 'node:assert/strict';
import { test } from 'node:test';

import { pickFresh, sampleFresh, seededRng } from '../src/util/random.ts';

// --- pickFresh ----------------------------------------------------------

test('pickFresh never returns the avoided value when an alternative exists', () => {
  const items = ['a', 'b', 'c', 'd'];
  for (let seed = 0; seed < 200; seed++) {
    assert.notEqual(pickFresh(seededRng(seed), items, 'a'), 'a');
  }
});

test('pickFresh falls back to the avoided value when it is the only option', () => {
  for (let seed = 0; seed < 20; seed++) {
    assert.equal(pickFresh(seededRng(seed), ['only'], 'only'), 'only');
  }
});

test('pickFresh with no avoid behaves like a plain pick: always from the pool', () => {
  const items = ['a', 'b', 'c'];
  for (let seed = 0; seed < 50; seed++) {
    assert.ok(items.includes(pickFresh(seededRng(seed), items, null)));
  }
});

// --- sampleFresh ----------------------------------------------------------

test('sampleFresh excludes every avoided item when enough fresh ones remain', () => {
  const items = [1, 2, 3, 4, 5, 6];
  const avoid = new Set([1, 2]);
  for (let seed = 0; seed < 100; seed++) {
    const picked = sampleFresh(seededRng(seed), items, 3, avoid);
    assert.equal(picked.length, 3);
    assert.equal(new Set(picked).size, 3, 'no duplicates within the round');
    for (const p of picked) assert.ok(!avoid.has(p), `${p} should have been avoided`);
  }
});

test('sampleFresh tops up from avoided items rather than shrinking the round', () => {
  const items = [1, 2, 3, 4];
  const avoid = new Set([1, 2, 3, 4]); // avoiding the whole pool
  for (let seed = 0; seed < 50; seed++) {
    const picked = sampleFresh(seededRng(seed), items, 3, avoid);
    assert.equal(picked.length, 3, 'still fills the round even though everything was avoided');
  }
});

test('sampleFresh with an empty avoid set behaves like plain sample', () => {
  const items = [1, 2, 3, 4, 5];
  for (let seed = 0; seed < 50; seed++) {
    const picked = sampleFresh(seededRng(seed), items, 3, new Set());
    assert.equal(picked.length, 3);
    assert.equal(new Set(picked).size, 3);
  }
});

test('sampleFresh never returns duplicates even when topping up', () => {
  const items = [1, 2, 3, 4, 5];
  const avoid = new Set([1, 2, 3, 4]);
  for (let seed = 0; seed < 100; seed++) {
    const picked = sampleFresh(seededRng(seed), items, 4, avoid);
    assert.equal(new Set(picked).size, picked.length, `seed ${seed}: duplicates in ${picked}`);
  }
});
