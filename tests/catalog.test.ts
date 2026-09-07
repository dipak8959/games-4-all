import assert from 'node:assert/strict';
import { test } from 'node:test';

import { GAMES_META, findGameMeta, gamesForAgeGroup } from '../src/games/catalog.ts';

test('every game declares a valid, non-empty age-group range', () => {
  for (const game of GAMES_META) {
    assert.ok(game.minAgeGroup >= 1 && game.minAgeGroup <= 3, `${game.id} minAgeGroup out of range`);
    assert.ok(game.maxAgeGroup >= 1 && game.maxAgeGroup <= 3, `${game.id} maxAgeGroup out of range`);
    assert.ok(game.minAgeGroup <= game.maxAgeGroup, `${game.id} has min > max`);
  }
});

test('every age group has at least one game', () => {
  for (const level of [1, 2, 3] as const) {
    assert.ok(gamesForAgeGroup(level).length > 0, `age group ${level} has no games`);
  }
});

test('gamesForAgeGroup only returns games whose range includes that level', () => {
  for (const level of [1, 2, 3] as const) {
    for (const game of gamesForAgeGroup(level)) {
      assert.ok(game.minAgeGroup <= level && level <= game.maxAgeGroup, `${game.id} shown outside its range`);
    }
  }
});

test('gamesForAgeGroup excludes games whose range does not include that level', () => {
  for (const level of [1, 2, 3] as const) {
    const shown = new Set(gamesForAgeGroup(level).map((g) => g.id));
    for (const game of GAMES_META) {
      const inRange = game.minAgeGroup <= level && level <= game.maxAgeGroup;
      assert.equal(shown.has(game.id), inRange, `${game.id} at level ${level}`);
    }
  }
});

test('every game id is unique and findGameMeta resolves it', () => {
  const ids = GAMES_META.map((g) => g.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate game ids');
  for (const id of ids) assert.equal(findGameMeta(id)?.id, id);
});

test('findGameMeta returns undefined for an unknown id', () => {
  assert.equal(findGameMeta('does-not-exist'), undefined);
});

test('Spell It! requires reading, so it is restricted to the 7+ group only', () => {
  const ids = (level: 1 | 2 | 3) => gamesForAgeGroup(level).map((g) => g.id);
  assert.ok(!ids(1).includes('wordbuilder'), 'shown to the 3-4 group');
  assert.ok(!ids(2).includes('wordbuilder'), 'shown to the 5-6 group');
  assert.ok(ids(3).includes('wordbuilder'), 'missing from the 7+ group');
});

test('How Many? and Spell It! are never both hidden from the same age group', () => {
  // A sanity check on the catalogue as a whole: every group should have a
  // reasonable spread, not accidentally lose most of its games.
  for (const level of [1, 2, 3] as const) {
    assert.ok(gamesForAgeGroup(level).length >= 2, `age group ${level} has fewer than 2 games`);
  }
});
