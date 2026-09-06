import { palette } from '../theme/tokens';
import { CountingScreen } from './counting/CountingScreen';
import { MemoryScreen } from './memory/MemoryScreen';
import { ShapesScreen } from './shapes/ShapesScreen';
import type { GameDefinition } from './types';

/**
 * The catalogue.
 *
 * Adding a game means adding an entry here — the home screen, progress
 * tracking, and the parent-facing skill list all read from this one list, so a
 * new game cannot ship half-wired.
 */
export const GAMES: readonly GameDefinition[] = [
  {
    id: 'memory',
    title: 'Find the Pairs',
    icon: '🧠',
    color: palette.sky,
    skill: 'Visual memory and concentration',
    ages: '3-7',
    Screen: MemoryScreen,
  },
  {
    id: 'counting',
    title: 'How Many?',
    icon: '🔢',
    color: palette.sun,
    skill: 'Counting and recognising numerals 1-12',
    ages: '3-6',
    Screen: CountingScreen,
  },
  {
    id: 'shapes',
    title: 'Sort It Out',
    icon: '🔺',
    color: palette.leaf,
    skill: 'Sorting by shape, colour, and size',
    ages: '3-6',
    Screen: ShapesScreen,
  },
];

export function findGame(id: string): GameDefinition | undefined {
  return GAMES.find((g) => g.id === id);
}
