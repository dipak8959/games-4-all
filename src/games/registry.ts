import { GAMES_META } from './catalog';
import { CountingScreen } from './counting/CountingScreen';
import { MemoryScreen } from './memory/MemoryScreen';
import { ShapesScreen } from './shapes/ShapesScreen';
import { SudokuScreen } from './sudoku/SudokuScreen';
import type { GameDefinition } from './types';
import { WordBuilderScreen } from './wordbuilder/WordBuilderScreen';

/**
 * Attaches each game's screen component to its catalogue metadata.
 *
 * Kept separate from `catalog.ts` (which has the actual game data —
 * titles, icons, age ranges) so that anything only needing metadata —
 * `gamesForAgeGroup`, Parent Zone's game list, tests — never has to load
 * React Native screen components just to read a title.
 */
const SCREEN_BY_ID: Readonly<Record<string, GameDefinition['Screen']>> = {
  memory: MemoryScreen,
  counting: CountingScreen,
  shapes: ShapesScreen,
  wordbuilder: WordBuilderScreen,
  sudoku: SudokuScreen,
};

export const GAMES: readonly GameDefinition[] = GAMES_META.map((meta) => {
  const Screen = SCREEN_BY_ID[meta.id];
  if (!Screen) {
    // A catalogue entry with no matching screen is a wiring bug, not a
    // runtime condition to handle gracefully — fail loudly at startup.
    throw new Error(`No screen registered for game "${meta.id}"`);
  }
  return { ...meta, Screen };
});

export function findGame(id: string): GameDefinition | undefined {
  return GAMES.find((g) => g.id === id);
}
