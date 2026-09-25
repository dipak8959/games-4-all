import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import {
  cheapestWay,
  LEFT,
  PUZZLES_PER_ROUND,
  RIGHT,
  createGame,
  createPuzzle,
  isSolved,
  nextPuzzle,
  openSides,
  sideTowards,
  specForLevel,
  starsForTurns,
  turnPiece,
  turnsToFit,
  wet,
  type WaterWorksState,
} from '../src/games/waterworks/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];

/** What each square of the route needs open: towards where the water comes
 *  from, and towards where it goes. */
function needs(state: WaterWorksState): Map<number, number> {
  const { route, cols } = state.puzzle;
  return new Map(
    route.map((cell, i) => [
      cell,
      (i === 0 ? LEFT : sideTowards(cols, cell, route[i - 1])) |
        (i === route.length - 1 ? RIGHT : sideTowards(cols, cell, route[i + 1])),
    ]),
  );
}

/** Turns each piece on the cheapest way round until it fits. */
function solve(state: WaterWorksState): WaterWorksState {
  let s = state;
  const way = cheapestWay(state.puzzle);
  for (const { cell, sides } of way?.steps ?? []) {
    const turns = turnsToFit(s.puzzle.pieces[cell], sides);
    for (let t = 0; t < turns; t += 1) s = turnPiece(s, cell);
  }
  return s;
}

function routeTurns(state: WaterWorksState): number {
  let sum = 0;
  for (const [cell, need] of needs(state)) sum += turnsToFit(state.puzzle.pieces[cell], need);
  return sum;
}

test('every puzzle is not yet solved, the cheapest way solves it in the fewest turns, and there is no trivial shortcut', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < 150; seed += 1) {
      const s = createGame(seededRng(seed * 7 + level), level);
      assert.equal(s.solved, false);
      assert.equal(isSolved(s.puzzle), false);
      assert.ok(s.puzzle.fewestTurns >= 1);
      const done = solve(s);
      assert.equal(done.solved, true, `level ${level} seed ${seed}: the route did not carry the water`);
      // The cheapest way takes exactly the fewest turns, and is never dearer
      // than the route the puzzle was built around.
      assert.equal(done.taps, s.puzzle.fewestTurns);
      assert.ok(s.puzzle.fewestTurns <= routeTurns(s));
      assert.ok(s.puzzle.fewestTurns >= Math.ceil(s.puzzle.pieces.length / 4), 'a shortcut makes it trivial');
    }
  }
});

test('the grid is the level\'s size, four across at most, and the route never crosses itself', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    assert.ok(spec.cols <= 4);
    for (let seed = 0; seed < 50; seed += 1) {
      const p = createPuzzle(seededRng(seed + 300 * level), level);
      assert.equal(p.pieces.length, spec.cols * spec.rows);
      assert.equal(new Set(p.route).size, p.route.length);
      assert.equal(p.route[0], p.tapRow * p.cols);
      assert.equal(p.route[p.route.length - 1], p.flowerRow * p.cols + p.cols - 1);
      for (const piece of p.pieces) assert.ok(piece.kind === 'straight' || piece.kind === 'bend' || spec.kinds.includes(piece.kind));
    }
  }
});

test('a tap turns one piece a quarter clockwise, and the water follows what joins', () => {
  const s = createGame(seededRng(4), 3);
  const cell = s.puzzle.route[0];
  const before = openSides(s.puzzle.pieces[cell]);
  const after = turnPiece(s, cell);
  assert.equal(after.taps, 1);
  assert.equal(openSides(after.puzzle.pieces[cell]), ((before << 1) | (before >> 3)) & 15);
  // Four taps bring it back round.
  let round = s;
  for (let i = 0; i < 4; i += 1) round = turnPiece(round, cell);
  assert.deepEqual(round.puzzle.pieces, s.puzzle.pieces);
  // Water is only ever where it can reach from the tap.
  for (const c of wet(solve(s).puzzle)) assert.ok(c >= 0 && c < s.puzzle.pieces.length);
});

test('three flowers watered end the round', () => {
  const rng = seededRng(9);
  let s = createGame(seededRng(9), 4);
  for (let i = 0; i < PUZZLES_PER_ROUND; i += 1) {
    assert.equal(s.complete, false);
    s = nextPuzzle(solve(s), rng, 4);
  }
  assert.equal(s.complete, true);
  assert.equal(starsForTurns(s.roundTaps, s.roundFewest), 3);
});

test('stars: near the fewest turns is three, a lot of trying is two, never none', () => {
  assert.equal(starsForTurns(6, 6), 3);
  assert.equal(starsForTurns(11, 6), 3);
  assert.equal(starsForTurns(20, 6), 2);
  assert.equal(starsForTurns(90, 6), 1);
});
