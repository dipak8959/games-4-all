import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seededRng } from '../src/util/random.ts';
import {
  createGame,
  enterNumber,
  selectCell,
  filledCount,
  sizeForLevel,
  type SudokuState,
} from '../src/games/sudoku/logic.ts';

// --- sizing ----------------------------------------------------------------

test('grid size grows with level: 4x4, then 6x6, then 9x9', () => {
  assert.equal(sizeForLevel(1), 4);
  assert.equal(sizeForLevel(2), 4);
  assert.equal(sizeForLevel(3), 6);
  assert.equal(sizeForLevel(4), 6);
  assert.equal(sizeForLevel(5), 9);
  assert.equal(sizeForLevel(6), 9);
});

// --- generation --------------------------------------------------------------

function assertValidSolution(state: SudokuState) {
  const { size, boxHeight, boxWidth, solution } = state;
  const at = (row: number, col: number) => solution[row * size + col];

  for (let row = 0; row < size; row++) {
    const seen = new Set(Array.from({ length: size }, (_, col) => at(row, col)));
    assert.equal(seen.size, size, `row ${row} has a duplicate`);
  }
  for (let col = 0; col < size; col++) {
    const seen = new Set(Array.from({ length: size }, (_, row) => at(row, col)));
    assert.equal(seen.size, size, `col ${col} has a duplicate`);
  }
  for (let boxRow = 0; boxRow < size; boxRow += boxHeight) {
    for (let boxCol = 0; boxCol < size; boxCol += boxWidth) {
      const seen = new Set<number>();
      for (let r = boxRow; r < boxRow + boxHeight; r++) {
        for (let c = boxCol; c < boxCol + boxWidth; c++) seen.add(at(r, c));
      }
      assert.equal(seen.size, size, `box at (${boxRow},${boxCol}) has a duplicate`);
    }
  }
}

test('every generated solution is a fully valid grid, at every size', () => {
  for (const level of [1, 3, 5]) {
    for (let seed = 0; seed < 10; seed++) {
      const state = createGame(seededRng(seed + level * 1000), level);
      assertValidSolution(state);
    }
  }
});

test('given cells match the solution, and the given count matches expectations', () => {
  for (const level of [1, 3, 5]) {
    const state = createGame(seededRng(level), level);
    for (let i = 0; i < state.cells.length; i++) {
      const cell = state.cells[i];
      if (cell.given) {
        assert.equal(cell.value, state.solution[i]);
      } else {
        assert.equal(cell.value, null);
      }
    }
    const givenCount = state.cells.filter((c) => c.given).length;
    assert.ok(givenCount > 0 && givenCount < state.cells.length, 'puzzle must be neither blank nor full');
  }
});

test('puzzle starts unselected, with zero mistakes and not complete', () => {
  const state = createGame(seededRng(1), 1);
  assert.equal(state.selected, null);
  assert.equal(state.mistakes, 0);
  assert.equal(state.complete, false);
});

// --- selecting ---------------------------------------------------------------

test('selecting an empty cell selects it', () => {
  const state = createGame(seededRng(1), 1);
  const emptyIndex = state.cells.findIndex((c) => !c.given);
  const next = selectCell(state, emptyIndex);
  assert.equal(next.selected, emptyIndex);
});

test('selecting a given cell is a no-op', () => {
  const state = createGame(seededRng(1), 1);
  const givenIndex = state.cells.findIndex((c) => c.given);
  const next = selectCell(state, givenIndex);
  assert.equal(next.selected, null);
  assert.deepEqual(next, state);
});

// --- entering numbers ----------------------------------------------------------

test('entering the correct number fills the cell and clears selection', () => {
  const state = createGame(seededRng(2), 1);
  const emptyIndex = state.cells.findIndex((c) => !c.given);
  const selected = selectCell(state, emptyIndex);
  const correct = state.solution[emptyIndex];

  const next = enterNumber(selected, correct);
  assert.equal(next.cells[emptyIndex].value, correct);
  assert.equal(next.selected, null);
  assert.equal(next.mistakes, 0);
});

test('entering a wrong number costs a mistake and leaves the grid untouched', () => {
  const state = createGame(seededRng(2), 1);
  const emptyIndex = state.cells.findIndex((c) => !c.given);
  const selected = selectCell(state, emptyIndex);
  const correct = state.solution[emptyIndex];
  const wrong = correct === 1 ? 2 : 1;

  const next = enterNumber(selected, wrong);
  assert.equal(next.mistakes, 1);
  assert.equal(next.cells[emptyIndex].value, null, 'a wrong entry must not appear in the grid');
  assert.equal(next.selected, emptyIndex, 'selection is kept so the child can try again');
});

test('entering a number with nothing selected does nothing', () => {
  const state = createGame(seededRng(1), 1);
  const next = enterNumber(state, 1);
  assert.deepEqual(next, state);
});

test('entering a number into an already-filled cell does nothing', () => {
  const state = createGame(seededRng(1), 1);
  const givenIndex = state.cells.findIndex((c) => c.given);
  const forced = { ...state, selected: givenIndex };
  const next = enterNumber(forced, state.solution[givenIndex]);
  assert.deepEqual(next, forced);
});

// --- completion ----------------------------------------------------------------

test('filling every empty cell with the solution completes the puzzle', () => {
  let state = createGame(seededRng(3), 1);
  const emptyIndices = state.cells.map((c, i) => (c.given ? -1 : i)).filter((i) => i >= 0);

  for (const index of emptyIndices) {
    state = selectCell(state, index);
    state = enterNumber(state, state.solution[index]);
    assert.equal(state.complete, emptyIndices.indexOf(index) === emptyIndices.length - 1);
  }

  assert.equal(state.complete, true);
  assert.equal(filledCount(state), state.cells.length);
});

test('nothing can be selected or entered after completion', () => {
  let state = createGame(seededRng(3), 1);
  const emptyIndices = state.cells.map((c, i) => (c.given ? -1 : i)).filter((i) => i >= 0);
  for (const index of emptyIndices) {
    state = selectCell(state, index);
    state = enterNumber(state, state.solution[index]);
  }
  assert.equal(state.complete, true);

  const afterSelect = selectCell(state, emptyIndices[0]);
  assert.deepEqual(afterSelect, state);
});
