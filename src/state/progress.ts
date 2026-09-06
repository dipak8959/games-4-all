/**
 * Play history.
 *
 * Intentionally minimal: counts, bests, and an adaptive level — nothing that
 * could identify a child and nothing that leaves the device. There are no
 * streaks or daily-login rewards — those are engagement mechanics that
 * pressure children to return, which is the opposite of what this app is for.
 */

import { nextLevel } from '../games/types';

export type GameProgress = {
  readonly rounds: number;
  readonly stars: number;
  /** Highest level ever completed, for the parent-facing skill summary. */
  readonly bestLevel: number;
  /** The level to play next, adjusted round-by-round by `nextLevel`. `null`
   *  means this game has never been played, so the parent's chosen starting
   *  difficulty applies instead — see `AppProvider.levelForGame`. */
  readonly currentLevel: number | null;
};

export type Progress = {
  readonly byGame: Readonly<Record<string, GameProgress>>;
};

export const EMPTY_GAME_PROGRESS: GameProgress = {
  rounds: 0,
  stars: 0,
  bestLevel: 1,
  currentLevel: null,
};

export const EMPTY_PROGRESS: Progress = { byGame: {} };

export function progressFor(progress: Progress, gameId: string): GameProgress {
  return progress.byGame[gameId] ?? EMPTY_GAME_PROGRESS;
}

export function recordRound(
  progress: Progress,
  gameId: string,
  result: { stars: number; level: number },
): Progress {
  const current = progressFor(progress, gameId);
  return {
    byGame: {
      ...progress.byGame,
      [gameId]: {
        rounds: current.rounds + 1,
        stars: current.stars + Math.max(0, result.stars),
        bestLevel: Math.max(current.bestLevel, result.level),
        currentLevel: nextLevel(result.level, result.stars),
      },
    },
  };
}

export function totalStars(progress: Progress): number {
  return Object.values(progress.byGame).reduce((sum, g) => sum + g.stars, 0);
}
