import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import {
  canSlide,
  createGame,
  isSolved,
  mixBoard,
  slide,
  solvedBoard,
  specForLevel,
  starsForMoves,
  type Board,
  type TileSlideState,
} from '../src/games/tileslide/logic.ts';
import { hitTarget } from '../src/theme/tokens.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];

/** The fewest moves to solve a board, by breadth-first search — exact for
 *  2x2 and 3x3, which is where it's used. */
function fewestMoves(board: Board, size: number): number {
  const goal = solvedBoard(size).join();
  const seen = new Set([board.join()]);
  let frontier: number[][] = [[...board]];
  for (let depth = 0; frontier.length; depth += 1) {
    const next: number[][] = [];
    for (const b of frontier) {
      if (b.join() === goal) return depth;
      const gap = b.indexOf(0);
      const r = Math.floor(gap / size);
      const c = gap % size;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (r + dr < 0 || r + dr >= size || c + dc < 0 || c + dc >= size) continue;
        const to = (r + dr) * size + c + dc;
        const n = [...b];
        [n[gap], n[to]] = [n[to], n[gap]];
        const key = n.join();
        if (!seen.has(key)) {
          seen.add(key);
          next.push(n);
        }
      }
    }
    frontier = next;
  }
  return Infinity;
}

test('every puzzle is mixed, never already solved, and always solvable', () => {
  for (const level of LEVELS) {
    const { size, mix } = specForLevel(level);
    for (let seed = 0; seed < (size === 4 ? 20 : 60); seed += 1) {
      const board = mixBoard(seededRng(seed * 13 + level), size, mix);
      assert.equal(board.length, size * size);
      assert.deepEqual([...board].sort((a, b) => a - b), [...solvedBoard(size)].sort((a, b) => a - b));
      assert.equal(isSolved(board), false);
      if (size <= 3) {
        const fewest = fewestMoves(board, size);
        assert.ok(fewest <= mix, `level ${level}: needs ${fewest} moves, more than the ${mix} that mixed it`);
      }
    }
  }
});

test('every tile is a full-size target, even on the four-by-four', () => {
  for (const level of LEVELS) {
    const { size } = specForLevel(level);
    assert.ok(size * hitTarget + (size - 1) <= 360 - 32, `${size}x${size} doesn't fit a phone at 72dp`);
  }
});

test('the puzzle gets genuinely harder: more moves to solve on average, level by level', () => {
  // The mix count is the dial, but what a player feels is how far from
  // solved it really is. Checked exactly on the 3x3 levels.
  const average = (level: number) => {
    const { size, mix } = specForLevel(level);
    let total = 0;
    for (let seed = 0; seed < 30; seed += 1) total += fewestMoves(mixBoard(seededRng(seed + 40), size, mix), size);
    return total / 30;
  };
  assert.ok(average(3) > average(2));
  assert.ok(average(4) > average(3));
});

function state(board: number[], size: number): TileSlideState {
  return { size, board, par: 10, moves: 0, complete: false };
}

test('a tile slides only in line with the gap, and pushes the tiles between', () => {
  // 1 2 3
  // 4 5 6
  // 7 8 _
  const s = state([...solvedBoard(3)], 3);
  assert.equal(canSlide(s, 0), false, 'the corner is not in line with the gap');
  assert.equal(canSlide(s, 4), false);
  assert.equal(canSlide(s, 8), false, 'the gap itself');
  assert.equal(slide(s, 4), s);

  const row = slide(s, 6); // tap 7: 7 and 8 both slide right
  assert.deepEqual([...row.board], [1, 2, 3, 4, 5, 6, 0, 7, 8]);
  assert.equal(row.moves, 2);

  const col = slide(s, 2); // tap 3: 3 and 6 both slide down
  assert.deepEqual([...col.board], [1, 2, 0, 4, 5, 3, 7, 8, 6]);
  assert.equal(col.moves, 2);
});

test('putting the last tile home ends the round', () => {
  const s = state([1, 2, 3, 4, 5, 6, 7, 0, 8], 3);
  const done = slide(s, 8);
  assert.equal(done.complete, true);
  assert.equal(slide(done, 7), done, 'nothing moves once it is solved');
});

test('a round played by a real search earns three stars; wandering earns fewer, never none', () => {
  assert.equal(starsForMoves(10, 14), 3);
  assert.equal(starsForMoves(28, 14), 3);
  assert.equal(starsForMoves(50, 14), 2);
  assert.equal(starsForMoves(500, 14), 1);
});

test('a new game at every level is not yet complete', () => {
  for (const level of LEVELS) {
    const s = createGame(seededRng(level), level);
    assert.equal(s.complete, false);
    assert.equal(s.moves, 0);
    assert.equal(s.par, specForLevel(level).mix);
  }
});
