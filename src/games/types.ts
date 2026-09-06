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
