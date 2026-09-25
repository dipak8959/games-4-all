import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import { MAX_LEVEL, MIN_LEVEL } from '../src/games/types.ts';
import { pairsForLevel } from '../src/games/memory/logic.ts';
import { rangeForLevel } from '../src/games/counting/logic.ts';
import { basketsForLevel, sortRuleForLevel } from '../src/games/shapes/logic.ts';
import { wordPoolForLevel } from '../src/games/wordbuilder/logic.ts';
import { sequenceLengthForLevel, tileCountForLevel } from '../src/games/patternplay/logic.ts';
import {
  factorRangeForLevel,
  operatorsForLevel,
  termRangeForLevel,
} from '../src/games/numbercrunch/logic.ts';
import { givensForLevel, sizeForLevel } from '../src/games/sudoku/logic.ts';
import { specForLevel as shapeBuilderSpec } from '../src/games/shapebuilder/logic.ts';

/**
 * Difficulty only ever goes one way.
 *
 * Every game shares one 1-6 scale and `nextLevel` moves a player along it by
 * a step at a time, so the promise the scale makes is simple: a level is
 * never easier than the level below it. A game is free to plateau — its
 * curve is allowed to be shorter than six — but it must never hand a child
 * who just earned three stars something *gentler* than what they had.
 *
 * These assertions are on each game's own difficulty dials rather than on
 * anything subjective, so a new game added to the catalogue can be held to
 * the same line by adding its dial here.
 */
const LEVELS = Array.from({ length: MAX_LEVEL - MIN_LEVEL + 1 }, (_, i) => MIN_LEVEL + i);

/** Asserts a per-level measure never falls as level rises, and that the top
 *  is genuinely above the bottom rather than flat all the way across. */
function climbs(what: string, measure: (level: number) => number) {
  const values = LEVELS.map(measure);
  for (let i = 1; i < values.length; i += 1) {
    assert.ok(
      values[i] >= values[i - 1],
      `${what} drops at level ${LEVELS[i]}: ${values.join(', ')}`,
    );
  }
  assert.ok(
    values[values.length - 1] > values[0],
    `${what} never rises at all: ${values.join(', ')}`,
  );
}

test('Find the Pairs deals more to remember as level rises', () => {
  climbs('memory pairs', pairsForLevel);
});

test('How Many? counts higher as level rises, and stops offering tiny counts', () => {
  climbs('counting ceiling', (level) => rangeForLevel(level).max);
  // The floor matters as much as the ceiling: if 1-3 stayed in the mix, a
  // top-level round could still be four subitisable questions in a row.
  climbs('counting floor', (level) => rangeForLevel(level).min);
});

test('Sort It Out adds baskets and sorting rules as level rises', () => {
  climbs('shape baskets', (level) => basketsForLevel('shape', level));
  climbs('colour baskets', (level) => basketsForLevel('color', level));

  // `sortRuleForLevel` is random, so sample it: what a level can ask for
  // must always include everything the level below could ask for.
  const rulesAt = (level: number) => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 300; seed += 1) seen.add(sortRuleForLevel(seededRng(seed), level));
    return seen;
  };
  for (let i = 1; i < LEVELS.length; i += 1) {
    const below = rulesAt(LEVELS[i - 1]);
    const here = rulesAt(LEVELS[i]);
    for (const rule of below) {
      assert.ok(here.has(rule), `level ${LEVELS[i]} stopped offering "${rule}" sorting`);
    }
  }
  climbs('sorting rules', (level) => rulesAt(level).size);
});

test('Spell It! asks for longer words as level rises', () => {
  climbs('word length', (level) => {
    const lengths = wordPoolForLevel(level).map((p) => p.word.length);
    // A tier is a single word length; if that ever stops being true this
    // measure is meaningless and the assertion should be rewritten.
    assert.equal(new Set(lengths).size, 1, `level ${level} mixes word lengths`);
    return lengths[0];
  });
});

test('Pattern Play grows both the board and the sequence as level rises', () => {
  climbs('pattern tiles', tileCountForLevel);
  climbs('pattern sequence', sequenceLengthForLevel);
});

test('Number Crunch widens its operators and its numbers as level rises', () => {
  for (let i = 1; i < LEVELS.length; i += 1) {
    const below = operatorsForLevel(LEVELS[i - 1]);
    const here = operatorsForLevel(LEVELS[i]);
    for (const op of below) {
      assert.ok(here.includes(op), `level ${LEVELS[i]} dropped the "${op}" operator`);
    }
  }
  climbs('operator count', (level) => operatorsForLevel(level).length);

  // Levels 3 and 4 share an operator set *and* a ceiling, so the floors are
  // what separate them: the easy, instantly-retrieved facts drop out of the
  // draw as level rises rather than the numbers simply getting bigger.
  climbs('term ceiling', (level) => termRangeForLevel(level).max);
  climbs('term floor', (level) => termRangeForLevel(level).min);
  climbs('factor ceiling', (level) => factorRangeForLevel(level).max);
  climbs('factor floor', (level) => factorRangeForLevel(level).min);
});

test('Sudoku gets bigger and emptier as level rises, with no repeated tier', () => {
  climbs('sudoku grid', sizeForLevel);
  climbs('sudoku empty cells', (level) => sizeForLevel(level) ** 2 - givensForLevel(level));

  // The point of keying clues to the level rather than to the grid size: no
  // promotion leaves a player on exactly the puzzle they just solved.
  const tiers = LEVELS.map((level) => `${sizeForLevel(level)}/${givensForLevel(level)}`);
  assert.equal(new Set(tiers).size, LEVELS.length, `repeated Sudoku tier: ${tiers.join(' ')}`);

  // And the size jumps are cushioned rather than doubling the work at once.
  const blanks = LEVELS.map((level) => sizeForLevel(level) ** 2 - givensForLevel(level));
  for (let i = 1; i < blanks.length; i += 1) {
    assert.ok(
      blanks[i] <= blanks[i - 1] * 2,
      `level ${LEVELS[i]} more than doubles the empty cells: ${blanks.join(', ')}`,
    );
  }
});

test('Shape Builder deals more pieces and more to fill, then asks for turning', () => {
  climbs('shape builder blocks', (level) => shapeBuilderSpec(level).blocks);
  climbs('shape builder pieces', (level) => shapeBuilderSpec(level).pieces);
  climbs('shape builder largest piece', (level) => shapeBuilderSpec(level).maxPiece);
  climbs('shape builder turning', (level) => (shapeBuilderSpec(level).rotation ? 1 : 0));
  // Blocks rise at every level, so no promotion repeats a puzzle.
  const blocks = LEVELS.map((level) => shapeBuilderSpec(level).blocks);
  assert.equal(new Set(blocks).size, LEVELS.length, `repeated tier: ${blocks.join(', ')}`);
});
