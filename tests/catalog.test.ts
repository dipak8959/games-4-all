import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  findGameMeta,
  GAME_CATEGORIES,
  GAMES_META,
  gamesByCategory,
  gamesForAge,
  searchGames,
} from '../src/games/catalog.ts';

test('every game declares a valid, non-empty age range', () => {
  for (const game of GAMES_META) {
    assert.ok(game.minAge >= 1 && game.minAge <= 99, `${game.id} minAge out of range`);
    assert.ok(game.maxAge >= 1 && game.maxAge <= 99, `${game.id} maxAge out of range`);
    assert.ok(game.minAge <= game.maxAge, `${game.id} has min > max`);
  }
});

test('every game belongs to one of the known categories', () => {
  const ids = new Set(GAME_CATEGORIES.map((c) => c.id));
  for (const game of GAMES_META) {
    assert.ok(ids.has(game.category), `${game.id} has an unknown category "${game.category}"`);
  }
});

test('gamesForAge only returns games whose range includes that age', () => {
  for (const age of [3, 6, 7, 10, 12, 30, 70]) {
    for (const game of gamesForAge(age)) {
      assert.ok(game.minAge <= age && age <= game.maxAge, `${game.id} shown outside its range at age ${age}`);
    }
  }
});

test('gamesForAge excludes games whose range does not include that age', () => {
  for (const age of [3, 6, 7, 10, 12, 30, 70]) {
    const shown = new Set(gamesForAge(age).map((g) => g.id));
    for (const game of GAMES_META) {
      const inRange = game.minAge <= age && age <= game.maxAge;
      assert.equal(shown.has(game.id), inRange, `${game.id} at age ${age}`);
    }
  }
});

test('a young child sees exactly the preschool-appropriate games', () => {
  const ids = gamesForAge(4).map((g) => g.id).sort();
  assert.deepEqual(ids, ['counting', 'memory', 'patternplay', 'shapes'].sort());
});

test('an adult profile is never shown a game built only for young children', () => {
  const ids = new Set(gamesForAge(35).map((g) => g.id));
  assert.ok(!ids.has('memory'), 'Find the Pairs shown to an adult');
  assert.ok(!ids.has('counting'), 'How Many? shown to an adult');
  assert.ok(!ids.has('shapes'), 'Sort It Out shown to an adult');
  assert.ok(!ids.has('wordbuilder'), 'Spell It! shown to an adult');
  // But an adult isn't left with nothing: games built to hold up at any age
  // still show.
  assert.ok(ids.has('sudoku'), 'Sudoku missing for an adult');
  assert.ok(ids.has('patternplay'), 'Pattern Play missing for an adult');
  assert.ok(ids.has('numbercrunch'), 'Number Crunch missing for an adult');
});

test('every age from 3 to 90 sees at least one game', () => {
  for (let age = 3; age <= 90; age++) {
    assert.ok(gamesForAge(age).length > 0, `age ${age} has no games`);
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

test('searchGames matches title or skill, case-insensitively', () => {
  const results = searchGames(GAMES_META, 'SPELL');
  assert.deepEqual(results.map((g) => g.id), ['wordbuilder']);

  const bySkill = searchGames(GAMES_META, 'arithmetic');
  assert.deepEqual(bySkill.map((g) => g.id), ['numbercrunch']);
});

test('searchGames with an empty or whitespace query returns everything unfiltered', () => {
  assert.deepEqual(searchGames(GAMES_META, ''), GAMES_META);
  assert.deepEqual(searchGames(GAMES_META, '   '), GAMES_META);
});

test('searchGames with no match returns an empty list', () => {
  assert.deepEqual(searchGames(GAMES_META, 'zzz-not-a-game'), []);
});

test('gamesByCategory with null returns everything unfiltered', () => {
  assert.deepEqual(gamesByCategory(GAMES_META, null), GAMES_META);
});

test('gamesByCategory only returns games in that category', () => {
  for (const c of GAME_CATEGORIES) {
    for (const game of gamesByCategory(GAMES_META, c.id)) {
      assert.equal(game.category, c.id);
    }
  }
});

test('every category has at least one game', () => {
  for (const c of GAME_CATEGORIES) {
    assert.ok(gamesByCategory(GAMES_META, c.id).length > 0, `category ${c.id} has no games`);
  }
});

test('every game practises something, and says how its round ends', () => {
  // The second half is the load-bearing one. A game that is hard to put down
  // is usually one with no ending — you stop when you fail, or you never
  // stop — and requiring this field means an unbounded game cannot be added
  // without someone writing a sentence that is plainly untrue.
  for (const game of GAMES_META) {
    assert.ok(game.skill.trim().length > 0, `${game.id} practises nothing`);
    assert.ok(game.roundEnds.trim().length > 0, `${game.id} never says how a round ends`);
    assert.ok(
      !/never|score|beat|forever|survive/i.test(game.roundEnds),
      `${game.id} ends on a score or not at all: "${game.roundEnds}"`,
    );
  }
});
