import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';

import { seededRng } from '../src/util/random.ts';
import { GAMES_META } from '../src/games/catalog.ts';
import { MAX_LEVEL, MIN_LEVEL } from '../src/games/types.ts';
import { pairsForLevel } from '../src/games/memory/logic.ts';
import { choicesForLevel, rangeForLevel } from '../src/games/counting/logic.ts';
import { basketsForLevel, sortRuleForLevel } from '../src/games/shapes/logic.ts';
import { decoysForLevel, wordPoolForLevel } from '../src/games/wordbuilder/logic.ts';
import { sequenceLengthForLevel, tileCountForLevel } from '../src/games/patternplay/logic.ts';
import {
  factorRangeForLevel,
  operatorsForLevel,
  termRangeForLevel,
} from '../src/games/numbercrunch/logic.ts';
import { givensForLevel, sizeForLevel } from '../src/games/sudoku/logic.ts';
import { specForLevel as shapeBuilderSpec } from '../src/games/shapebuilder/logic.ts';
import { specForLevel as puddleHopSpec } from '../src/games/puddlehop/logic.ts';
import { specForLevel as laneDashSpec } from '../src/games/lanedash/logic.ts';
import { specForLevel as oddOneOutSpec } from '../src/games/oddoneout/logic.ts';
import { specForLevel as memoryGridSpec } from '../src/games/memorygrid/logic.ts';
import { specForLevel as shadowMatchSpec } from '../src/games/shadowmatch/logic.ts';
import { specForLevel as whichCupSpec } from '../src/games/whichcup/logic.ts';
import { specForLevel as bigToSmallSpec } from '../src/games/bigtosmall/logic.ts';
import { specForLevel as tileSlideSpec } from '../src/games/tileslide/logic.ts';
import { specForLevel as wordLadderSpec } from '../src/games/wordladder/logic.ts';
import { specForLevel as fruitCatchSpec } from '../src/games/fruitcatch/logic.ts';
import { specForLevel as mazeSpec } from '../src/games/maze/logic.ts';
import { balloonsForLevel, specForLevel as balloonSpec } from '../src/games/ballooncount/logic.ts';
import { specForLevel as treasureSpec } from '../src/games/treasurehunt/logic.ts';
import { specForLevel as waterSpec } from '../src/games/waterworks/logic.ts';
import { specForLevel as bricksSpec } from '../src/games/bouncebricks/logic.ts';
import { specForLevel as wormSpec } from '../src/games/hungryworm/logic.ts';
import { specForLevel as peekabooSpec } from '../src/games/peekaboo/logic.ts';
import { specForLevel as hoopSpec } from '../src/games/hoopshot/logic.ts';
import { specForLevel as landingSpec } from '../src/games/softlanding/logic.ts';
import { specForLevel as towerSpec } from '../src/games/talltower/logic.ts';
import { specForLevel as duckSpec } from '../src/games/duckcrossing/logic.ts';
import { specForLevel as codeSpec } from '../src/games/codecracker/logic.ts';
import { specForLevel as clockSpec } from '../src/games/clocktime/logic.ts';
import { specForLevel as rhymeSpec } from '../src/games/rhymetime/logic.ts';
import { specForLevel as marketSpec } from '../src/games/marketmemory/logic.ts';
import { specForLevel as countAroundSpec } from '../src/games/countaround/logic.ts';
import { specForLevel as starJarSpec } from '../src/games/starjar/logic.ts';
import { specForLevel as mazeTeamSpec } from '../src/games/mazeteam/logic.ts';
import { specForLevel as echoSpec } from '../src/games/echobeat/logic.ts';
import { specForLevel as skiSpec } from '../src/games/skislalom/logic.ts';
import { specForLevel as miniGolfSpec } from '../src/games/minigolf/logic.ts';
import { specForLevel as paperPlaneSpec } from '../src/games/paperplane/logic.ts';
import { specForLevel as cloudHopperSpec } from '../src/games/cloudhopper/logic.ts';

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

test('Puddle Hop runs faster, with more in the way and less room between, as level rises', () => {
  climbs('puddle hop speed', (level) => puddleHopSpec(level).speed);
  climbs('puddle hop obstacles', (level) => puddleHopSpec(level).obstacles);
  climbs('puddle hop kinds', (level) => puddleHopSpec(level).kinds.length);
  // Gaps shrink, so the measure that climbs is how *little* room there is.
  climbs('puddle hop tightness', (level) => -puddleHopSpec(level).gapMin);
  climbs('puddle hop tightness at most', (level) => -puddleHopSpec(level).gapMax);
  const speeds = LEVELS.map((level) => puddleHopSpec(level).speed);
  assert.equal(new Set(speeds).size, LEVELS.length, `repeated tier: ${speeds.join(', ')}`);
});

// --- IT_GROWS -----------------------------------------------------------------

/**
 * The charter's IT_GROWS, held to the letter: every step up is harder.
 *
 * The checks above allow a flat step; this one doesn't. For each game, its
 * difficulty dials are listed together, and between every level and the
 * next, no dial may fall and at least one must rise. So there is no level
 * a child can be promoted into that plays like the one they just left.
 *
 * A new game joins by adding a row. `every game is on the list` below fails
 * until it does, so it can't be forgotten.
 */
const DIALS: Readonly<Record<string, (level: number) => readonly number[]>> = {
  memory: (l) => [pairsForLevel(l)],
  counting: (l) => [rangeForLevel(l).min, rangeForLevel(l).max, choicesForLevel(l)],
  shapes: (l) => {
    const rules = new Set<string>();
    for (let seed = 0; seed < 300; seed += 1) rules.add(sortRuleForLevel(seededRng(seed), l));
    return [rules.size, basketsForLevel('shape', l), basketsForLevel('color', l)];
  },
  wordbuilder: (l) => {
    const length = wordPoolForLevel(l)[0].word.length;
    return [length, length + decoysForLevel(l)];
  },
  patternplay: (l) => [tileCountForLevel(l), sequenceLengthForLevel(l)],
  numbercrunch: (l) => [
    operatorsForLevel(l).length,
    termRangeForLevel(l).min,
    termRangeForLevel(l).max,
    factorRangeForLevel(l).min,
    factorRangeForLevel(l).max,
  ],
  sudoku: (l) => [sizeForLevel(l), sizeForLevel(l) ** 2 - givensForLevel(l)],
  shapebuilder: (l) => {
    const spec = shapeBuilderSpec(l);
    return [spec.blocks, spec.pieces, spec.maxPiece, spec.rotation ? 1 : 0];
  },
  lanedash: (l) => {
    const spec = laneDashSpec(l);
    // Rivals closer behind and less room between rows count negatively.
    return [spec.lanes, spec.speed, spec.rows, spec.kinds.length, spec.doubleChance, -spec.margin, -spec.gapMin];
  },
  memorygrid: (l) => {
    const spec = memoryGridSpec(l);
    // Less time to look counts negatively.
    return [spec.size, spec.lit, -spec.showMs];
  },
  oddoneout: (l) => {
    const spec = oddOneOutSpec(l);
    // A size ratio closer to 1 is a smaller, harder-to-see difference.
    return [spec.items, spec.differences.length, spec.sizeRatio, spec.colourNoise ? 1 : 0];
  },
  fruitcatch: (l) => {
    const spec = fruitCatchSpec(l);
    // Falling faster, and less time between things, count negatively.
    return [spec.columns, -spec.fallTime, -spec.spawnGap, spec.cones];
  },
  maze: (l) => {
    const spec = mazeSpec(l);
    return [spec.cols, spec.rows, spec.key ? 1 : 0];
  },
  ballooncount: (l) => {
    const spec = balloonSpec(l);
    return [balloonsForLevel(l), spec.max, spec.decoys, spec.steps.length, spec.down ? 1 : 0];
  },
  treasurehunt: (l) => {
    const spec = treasureSpec(l);
    // A step count says less than an arrow.
    return [spec.cols * spec.rows, spec.clue === 'steps' ? 1 : 0];
  },
  waterworks: (l) => {
    const spec = waterSpec(l);
    return [spec.cols * spec.rows, spec.kinds.length];
  },
  shadowmatch: (l) => {
    const spec = shadowMatchSpec(l);
    return [spec.choices, spec.near, spec.turn];
  },
  whichcup: (l) => {
    const spec = whichCupSpec(l);
    // Quicker swaps count negatively.
    return [spec.cups, spec.swaps, -spec.swapMs, spec.reach === 'any' ? 1 : 0];
  },
  bigtosmall: (l) => {
    const spec = bigToSmallSpec(l);
    // A ratio closer to 1 is a smaller step between sizes.
    return [spec.items, spec.ratio, spec.turned ? 1 : 0, spec.mixedColours ? 1 : 0];
  },
  tileslide: (l) => {
    const spec = tileSlideSpec(l);
    return [spec.size, spec.mix];
  },
  wordladder: (l) => {
    const spec = wordLadderSpec(l);
    return [spec.length, spec.steps, spec.choices, spec.temptation];
  },
  puddlehop: (l) => {
    const spec = puddleHopSpec(l);
    // Gaps shrink as it gets harder, so they count negatively.
    return [spec.speed, spec.obstacles, spec.kinds.length, -spec.gapMin, -spec.gapMax];
  },
  bouncebricks: (l) => {
    const spec = bricksSpec(l);
    // A shorter paddle is harder.
    return [-spec.paddleW, spec.speed, spec.rows * spec.cols, spec.tough];
  },
  hungryworm: (l) => {
    const spec = wormSpec(l);
    // A shorter tick is a faster worm.
    return [-spec.tick, spec.growBy, spec.rocks];
  },
  peekaboo: (l) => {
    const spec = peekabooSpec(l);
    // Less time up is harder.
    return [spec.cols * spec.rows, -spec.up, spec.together, spec.sleepy];
  },
  hoopshot: (l) => {
    const spec = hoopSpec(l);
    // A narrower hoop and a shorter guide are harder.
    return [-spec.rim, -spec.guide, spec.spread, spec.wind, spec.sway];
  },
  softlanding: (l) => {
    const spec = landingSpec(l);
    // A gentler landing needed, a smaller pad and less fuel are harder.
    return [spec.gravity, -spec.safeV, -spec.safeH, -spec.padW, spec.offset, spec.hills, spec.wind, -spec.fuel];
  },
  talltower: (l) => {
    const spec = towerSpec(l);
    // A narrower tower, less forgiveness and an outline to aim at all make
    // it easier, so they count negatively.
    return [-spec.width, spec.speed, -spec.snap, spec.accel, spec.ghost ? 0 : 1, spec.alternate ? 1 : 0];
  },
  duckcrossing: (l) => {
    const spec = duckSpec(l);
    return [spec.lanes, spec.speed, -spec.gap, spec.maxLength];
  },
  codecracker: (l) => {
    const spec = codeSpec(l);
    // Marks under each shape are the easy version.
    return [spec.length, spec.symbols, spec.repeats ? 1 : 0, spec.perSlot ? 0 : 1];
  },
  clocktime: (l) => {
    const spec = clockSpec(l);
    // A finer step is harder.
    return [-spec.step, spec.choices, spec.near, spec.trap ? 1 : 0];
  },
  rhymetime: (l) => {
    const spec = rhymeSpec(l);
    return [spec.tier, spec.choices, spec.sameStart ? 1 : 0, spec.spelledDifferently ? 1 : 0, spec.lookAlike ? 1 : 0];
  },
  marketmemory: (l) => {
    const spec = marketSpec(l);
    return [spec.target, spec.shelf, spec.shuffleShelf ? 1 : 0, spec.twins ? 1 : 0];
  },
  countaround: (l) => {
    const spec = countAroundSpec(l);
    return [spec.to, spec.rules.length];
  },
  starjar: (l) => {
    const spec = starJarSpec(l);
    return [spec.countMax, spec.addMax, spec.timesMax, spec.choices];
  },
  mazeteam: (l) => {
    const spec = mazeTeamSpec(l);
    return [spec.cols * spec.rows, spec.key ? 1 : 0];
  },
  echobeat: (l) => {
    const spec = echoSpec(l);
    // A closer copy is harder, and so is no marks to follow.
    return [spec.beats, -spec.tolerance, spec.marks ? 0 : 1];
  },
  cloudhopper: (l) => {
    const spec = cloudHopperSpec(l);
    return [spec.clouds, -spec.width, spec.gap, spec.spread, spec.drifting, spec.puffs];
  },
  paperplane: (l) => {
    const spec = paperPlaneSpec(l);
    return [spec.stacks, -spec.gap, spec.speed, spec.swing, -spec.spacing, spec.bobbing];
  },
  minigolf: (l) => {
    const spec = miniGolfSpec(l);
    return [-spec.cup, -spec.friction, spec.hardest];
  },
  skislalom: (l) => {
    const spec = skiSpec(l);
    return [spec.gates, -spec.gateWidth, spec.speed, spec.swing, -spec.spacing, spec.trees];
  },
};

test('IT_GROWS: every game is harder at every level than at the one below', () => {
  for (const [game, dials] of Object.entries(DIALS)) {
    for (let i = 1; i < LEVELS.length; i += 1) {
      const below = dials(LEVELS[i - 1]);
      const here = dials(LEVELS[i]);
      const fell = here.findIndex((v, d) => v < below[d]);
      assert.equal(fell, -1, `${game}: level ${LEVELS[i]} is easier than ${LEVELS[i - 1]} on dial ${fell}`);
      assert.ok(
        here.some((v, d) => v > below[d]),
        `${game}: level ${LEVELS[i]} plays exactly like level ${LEVELS[i - 1]} (${here.join(', ')})`,
      );
    }
  }
});

test('IT_GROWS: every game is on the list', () => {
  const ids = GAMES_META.map((g) => g.id).sort();
  assert.deepEqual(Object.keys(DIALS).sort(), ids, 'a game is missing its difficulty dials');
});

test('IT_GROWS: every game moves its own level with nextLevel after a round', () => {
  // The step up only happens if the screen asks for it. Each game screen
  // must pass the round's stars through `nextLevel` when "Play again" starts
  // the next one, rather than replaying at the level it had.
  const dirs = readdirSync('src/games', { withFileTypes: true }).filter((d) => d.isDirectory());
  for (const dir of dirs) {
    const screen = readdirSync(`src/games/${dir.name}`).find((f) => f.endsWith('Screen.tsx'));
    if (!screen) continue;
    const source = readFileSync(`src/games/${dir.name}/${screen}`, 'utf8');
    assert.match(source, /nextLevel\(level, stars\)/, `${screen} does not move its level after a round`);
  }
});
