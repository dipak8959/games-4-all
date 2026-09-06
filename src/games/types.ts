import type React from 'react';

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

export type GameDefinition = {
  readonly id: string;
  /** Shown to parents. Children navigate by the icon and colour. */
  readonly title: string;
  readonly icon: string;
  readonly color: string;
  /** Parent-facing: what this game actually practises. */
  readonly skill: string;
  readonly ages: string;
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

export function clampLevel(level: number): number {
  return Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, level));
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
