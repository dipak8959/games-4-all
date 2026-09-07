import { palette } from '../theme/tokens';
import type { AgeGroupLevel } from '../state/ageGroups';

/**
 * Pure catalogue metadata — deliberately no `Screen` component reference
 * here, and no React import. Keeping this separate from `registry.ts` (which
 * attaches the actual screen components) means this file, and everything
 * that only needs metadata — filtering, Parent Zone's game list, tests —
 * never has to load React Native screens just to read a title or age range.
 */
export type GameMeta = {
  readonly id: string;
  /** Shown to parents. Children navigate by the icon and colour. */
  readonly title: string;
  readonly icon: string;
  readonly color: string;
  /** Parent-facing: what this game actually practises. */
  readonly skill: string;
  /** Free-text age range shown to parents (e.g. "3-6"). Keep this in sync
   *  with `minAgeGroup`/`maxAgeGroup` — it's the human-readable form of the
   *  same range, not an independent claim. */
  readonly ages: string;
  /** The age-group range Home actually filters by. Inclusive. */
  readonly minAgeGroup: AgeGroupLevel;
  readonly maxAgeGroup: AgeGroupLevel;
};

/**
 * The catalogue. Adding a game means adding an entry here (and registering
 * its screen in `registry.ts`) — Home, progress tracking, and the parent-
 * facing skill list all read from this one list, so a new game can't ship
 * half-wired.
 *
 * `minAgeGroup`/`maxAgeGroup` decide whether a game shows on Home for the
 * currently selected age group — see `gamesForAgeGroup`. This is a genuine
 * catalogue filter, separate from adaptive difficulty: a game a child's age
 * group excludes doesn't quietly appear easier, it doesn't appear at all.
 */
export const GAMES_META: readonly GameMeta[] = [
  {
    id: 'memory',
    title: 'Find the Pairs',
    icon: '🧠',
    color: palette.sky,
    skill: 'Visual memory and concentration',
    ages: '3-7',
    minAgeGroup: 1,
    maxAgeGroup: 3,
  },
  {
    id: 'counting',
    title: 'How Many?',
    icon: '🔢',
    color: palette.sun,
    skill: 'Counting and recognising numerals 1-12',
    ages: '3-6',
    minAgeGroup: 1,
    // Counting to 12 is squarely a preschool skill; by 7 most children have
    // it, so this steps aside rather than overstaying as "too easy".
    maxAgeGroup: 2,
  },
  {
    id: 'shapes',
    title: 'Sort It Out',
    icon: '🔺',
    color: palette.leaf,
    skill: 'Sorting by shape, colour, and size',
    ages: '3-7',
    minAgeGroup: 1,
    maxAgeGroup: 3,
  },
  {
    id: 'wordbuilder',
    title: 'Spell It!',
    icon: '🔤',
    color: palette.grape,
    skill: 'Reading and spelling simple words',
    ages: '7+',
    // The one game in the catalogue that requires reading, which is why it's
    // the one game restricted to a single age group rather than spanning the
    // whole range — the 3-4 and 5-6 groups include children who can't read
    // yet, and this app never assumes otherwise.
    minAgeGroup: 3,
    maxAgeGroup: 3,
  },
];

export function findGameMeta(id: string): GameMeta | undefined {
  return GAMES_META.find((g) => g.id === id);
}

/** Games Home should show for a given age group — the actual catalogue
 *  filter, not just a difficulty seed. */
export function gamesForAgeGroup(ageGroup: AgeGroupLevel): readonly GameMeta[] {
  return GAMES_META.filter((g) => g.minAgeGroup <= ageGroup && ageGroup <= g.maxAgeGroup);
}
