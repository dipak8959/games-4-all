import type React from 'react';

import type { GameMeta } from './catalog';

/** What a game reports back when a round ends. */
export type RoundResult = {
  /** 1-3. There is no zero: finishing a round always earns something. */
  readonly stars: number;
  /** Level the child completed, used to remember where they got to. */
  readonly level: number;
};

export type GameScreenProps = {
  readonly level: number;
  readonly onRoundComplete: (result: RoundResult) => void;
  readonly onExit: () => void;
};

/** Catalogue metadata plus the actual screen component — see `catalog.ts`
 *  for why those two are kept separate. */
export type GameDefinition = GameMeta & {
  readonly Screen: React.ComponentType<GameScreenProps>;
};

/**
 * Stars are awarded on effort, not perfection: a completed round is never worth
 * zero, and the scale rewards a child who kept trying rather than punishing
 * mistakes.
 */
export function starsForMistakes(mistakes: number): number {
  if (mistakes === 0) return 3;
  if (mistakes <= 2) return 2;
  return 1;
}

/** The adaptive difficulty range every game clamps into. A game's own level
 *  scaling (pool sizes, ranges, basket counts) is free to saturate before
 *  MAX_LEVEL — that just means its difficulty curve is shorter, not wrong. */
export const MIN_LEVEL = 1;
export const MAX_LEVEL = 6;

/** Fallback starting level when there's no profile age to go on at all. */
export const DEFAULT_LEVEL = 3;

export function clampLevel(level: number): number {
  return Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, level));
}

/**
 * Where a profile starts a game it has never played.
 *
 * A game's allowed age range can span decades (Number Crunch runs 6-99), so
 * starting everyone at the same middling level is wrong at both ends: it
 * hands a six-year-old something too hard and asks a forty-one-year-old to
 * warm up on "6 + 7" for several rounds before the game offers anything
 * worth their time.
 *
 * The bands follow two well-established developmental curves that happen to
 * run together: arithmetic milestones (add/subtract within 20 around 6-7,
 * within 100 around 7-8, times tables and division around 8-9, fluent by
 * ~11) and short-term memory span (about 3 items at 4, 6 by 10-12, levelling
 * off at 7-8 by around 16). Levels 1-6 are spread across that, which is why
 * the top band opens at 14 rather than at adulthood — by then both curves
 * are essentially at their plateau.
 *
 * This is only a *starting point* — not an age-to-difficulty rule. From the
 * first completed round onward the level is driven purely by how the player
 * actually did (`nextLevel`), so a confident young player climbs past this
 * and an adult who'd rather take it gently drops below it.
 */
export function startingLevelForAge(age: number): number {
  if (age <= 4) return 1;
  if (age <= 6) return 2;
  if (age <= 8) return 3;
  if (age <= 10) return 4;
  if (age <= 13) return 5;
  return MAX_LEVEL;
}

/**
 * One adaptive-difficulty step.
 *
 * A perfect round (3 stars, no mistakes) nudges the level up; a rough one (1
 * star, 3+ mistakes) nudges it down; a middling round (2 stars) holds steady.
 * Never more than one step at a time, so difficulty drifts with a child's
 * performance rather than swinging — a single lucky or unlucky round can't
 * catapult them from the easiest to the hardest content.
 */
export function nextLevel(level: number, stars: number): number {
  if (stars >= 3) return clampLevel(level + 1);
  if (stars <= 1) return clampLevel(level - 1);
  return clampLevel(level);
}
