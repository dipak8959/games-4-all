import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import {
  BOARD_COLS,
  BOARD_ROWS,
  createGame,
  filledBlocks,
  footprint,
  normalise,
  rotate,
  sameShape,
  selectPiece,
  specForLevel,
  tapCell,
  turnSelected,
  type Cell,
  type ShapeBuilderState,
} from '../src/games/shapebuilder/logic.ts';

const LEVELS = [1, 2, 3, 4, 5, 6];
const key = ([r, c]: Cell) => `${r},${c}`;

/** Solves a board by brute force — every piece, every turn, every spot. The
 *  tests can't trust the generator's own record of how it cut the outline,
 *  so solvability is checked from nothing but what a player is shown. */
function solve(state: ShapeBuilderState): ShapeBuilderState | null {
  if (state.complete) return state;
  const covered = new Set(
    state.pieces.filter((p) => p.at).flatMap((p) => footprint(p, p.at as Cell)).map(key),
  );
  const openCell = state.outline.find((cell) => !covered.has(key(cell)));
  if (!openCell) return null;
  // Whichever piece fills the first open cell must cover it with one of its
  // blocks, so try each loose piece, each way it can face, each block of it
  // on that cell. Placing goes through `tapCell` like a real tap would.
  for (const piece of state.pieces.filter((p) => p.at == null)) {
    let s = selectPiece(state, piece.id);
    for (let turn = 0; turn < (s.rotation ? 4 : 1); turn += 1) {
      const current = s.pieces.find((p) => p.id === piece.id) as (typeof s.pieces)[number];
      for (const [r, c] of current.cells) {
        const anchor: Cell = [openCell[0] - r, openCell[1] - c];
        // Tap the block that makes this anchor the first one tried.
        const probe = { ...s, pieces: s.pieces.map((p) => (p.id === piece.id ? { ...p, cells: [[r, c] as Cell, ...p.cells.filter(([pr, pc]) => pr !== r || pc !== c)] } : p)) };
        const tried = tapCell(probe, openCell);
        const placed = tried.pieces.find((p) => p.id === piece.id);
        if (tried.mistakes === s.mistakes && placed?.at && key(placed.at) === key(anchor)) {
          const solved = solve({
            ...tried,
            pieces: tried.pieces.map((p) => (p.id === piece.id ? { ...p, cells: current.cells } : p)),
          });
          if (solved) return solved;
        }
      }
      s = turnSelected(s);
    }
  }
  return null;
}

test('a board always fits on a phone at full touch-target size', () => {
  // Four 72dp columns plus both gutters is the most a narrow phone takes.
  assert.ok(BOARD_COLS <= 4);
  for (const level of LEVELS) {
    for (let seed = 0; seed < 60; seed += 1) {
      const state = createGame(seededRng(seed * 13 + level), level);
      for (const [r, c] of state.outline) {
        assert.ok(r >= 0 && r < BOARD_ROWS && c >= 0 && c < BOARD_COLS, `off the board at level ${level}`);
      }
    }
  }
});

test('every level deals the pieces and blocks its spec asks for', () => {
  for (const level of LEVELS) {
    const spec = specForLevel(level);
    for (let seed = 0; seed < 60; seed += 1) {
      const state = createGame(seededRng(seed * 7 + level), level);
      assert.equal(state.pieces.length, spec.pieces);
      assert.equal(state.outline.length, spec.blocks);
      assert.equal(
        state.pieces.reduce((n, p) => n + p.cells.length, 0),
        spec.blocks,
        'the pieces must add up to exactly the outline',
      );
      for (const piece of state.pieces) {
        assert.ok(piece.cells.length >= 2 && piece.cells.length <= spec.maxPiece);
        assert.equal(piece.at, null, 'every piece starts in the tray');
      }
      assert.equal(new Set(state.outline.map(key)).size, state.outline.length, 'outline cells repeat');
    }
  }
});

test('the outline is one connected shape', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < 60; seed += 1) {
      const { outline } = createGame(seededRng(seed * 3 + level), level);
      const cells = new Set(outline.map(key));
      const seen = new Set([key(outline[0])]);
      const queue = [outline[0]];
      while (queue.length) {
        const [r, c] = queue.pop() as Cell;
        for (const n of [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]] as Cell[]) {
          if (cells.has(key(n)) && !seen.has(key(n))) {
            seen.add(key(n));
            queue.push(n);
          }
        }
      }
      assert.equal(seen.size, cells.size, `level ${level} seed ${seed} deals an outline in bits`);
    }
  }
});

test('every puzzle can be solved from only what the player is shown', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < 40; seed += 1) {
      const state = createGame(seededRng(seed * 31 + level), level);
      const solved = solve(state);
      assert.ok(solved, `level ${level} seed ${seed} has no solution`);
      assert.equal(solved.complete, true);
      assert.equal(filledBlocks(solved), state.outline.length);
    }
  }
});

test('below level 3 no piece needs turning; from level 3 pieces arrive turned', () => {
  for (const level of [1, 2]) {
    const state = createGame(seededRng(level), level);
    assert.equal(state.rotation, false);
    const held = selectPiece(state, state.pieces[0].id);
    assert.equal(turnSelected(held), held, 'turning does nothing yet');
  }
  for (const level of [3, 4, 5, 6]) {
    const state = createGame(seededRng(level * 5), level);
    assert.equal(state.rotation, true);
  }
});

test('turning is a quarter turn clockwise, and four of them come back round', () => {
  const ell: Cell[] = [[0, 0], [1, 0], [1, 1]];
  assert.deepEqual(rotate(ell), normalise([[0, 0], [0, 1], [1, 0]]));
  assert.ok(sameShape(rotate(rotate(rotate(rotate(ell)))), ell));
  // Turning never mirrors: a J never becomes an L.
  const jay: Cell[] = [[0, 1], [1, 1], [2, 0], [2, 1]];
  const ellFour: Cell[] = [[0, 0], [1, 0], [2, 0], [2, 1]];
  let t: Cell[] = jay;
  for (let i = 0; i < 4; i += 1) {
    assert.ok(!sameShape(t, ellFour), 'a turn produced a mirror image');
    t = rotate(t);
  }
});

test('a piece that does not fit costs one mistake and stays selected', () => {
  // A three-block strip, and an upright domino that cannot go anywhere in it.
  const state: ShapeBuilderState = {
    rows: BOARD_ROWS,
    cols: BOARD_COLS,
    outline: [[0, 0], [0, 1], [0, 2]],
    pieces: [
      { id: 0, cells: [[0, 0], [1, 0]], at: null },
      { id: 1, cells: [[0, 0]], at: null },
    ],
    selected: 0,
    rotation: true,
    mistakes: 0,
    complete: false,
  };
  const missed = tapCell(state, [0, 1]);
  assert.equal(missed.mistakes, 1);
  assert.equal(missed.selected, 0, 'the piece stays in hand to try again');
  assert.equal(missed.pieces[0].at, null);

  // Off the outline is not a guess at all — it is ignored.
  assert.equal(tapCell(state, [3, 3]), state);

  // Turned flat, the same piece fits — and a tap on either gap cell is
  // enough, not only the one its first block lands on.
  const flat = turnSelected(state);
  const placed = tapCell(flat, [0, 2]);
  assert.equal(placed.mistakes, 0);
  assert.deepEqual(placed.pieces[0].at, [0, 1]);
  assert.equal(placed.selected, null);
});

test('a placed piece can always be picked back up, so no move is permanent', () => {
  const solved = solve(createGame(seededRng(9), 5)) as ShapeBuilderState;
  assert.ok(solved.complete);
  // Once complete, the board is done: nothing more can change.
  const piece = solved.pieces[0];
  assert.equal(tapCell(solved, footprint(piece, piece.at as Cell)[0]), solved);

  const almost = { ...solved, complete: false };
  const lifted = tapCell(almost, footprint(piece, piece.at as Cell)[0]);
  assert.equal(lifted.pieces.find((p) => p.id === piece.id)?.at, null);
  assert.equal(lifted.selected, piece.id);
  assert.equal(lifted.mistakes, 0);
});

test('a round is never every piece the same shape', () => {
  for (const level of [2, 3, 4, 5, 6]) {
    for (let seed = 0; seed < 60; seed += 1) {
      const { pieces } = createGame(seededRng(seed + level * 100), level);
      assert.ok(
        !pieces.every((p) => sameShape(p.cells, pieces[0].cells)),
        `level ${level} seed ${seed} deals identical pieces only`,
      );
    }
  }
});
