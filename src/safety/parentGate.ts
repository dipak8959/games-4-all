import { randInt, shuffle, type Rng } from '../util/random';

/**
 * Parent gate.
 *
 * Guards anything a child should not reach alone: settings, screen-time limits,
 * and data deletion. The challenge is deliberately *literacy- and arithmetic-
 * gated* — two-digit multiplication sits well beyond the 3-7 age band the games
 * target, while being trivial for an adult.
 *
 * This is a speed bump, not authentication. It exists to stop accidental and
 * casual access, which is what a gate on a children's app is for. It is not a
 * secret and must never guard anything whose disclosure would matter.
 */

export type GateChallenge = {
  readonly prompt: string;
  readonly answer: number;
  readonly choices: readonly number[];
};

const MIN_FACTOR = 4;
const MAX_FACTOR = 9;
const MULTIPLIER = 10;

/**
 * Builds a "what is N x M" question with four plausible answers.
 *
 * Distractors are near-misses so the answer cannot be found by picking the
 * largest or smallest option.
 */
export function createChallenge(rng: Rng): GateChallenge {
  const a = randInt(rng, MIN_FACTOR, MAX_FACTOR);
  const b = randInt(rng, MIN_FACTOR, MAX_FACTOR) * MULTIPLIER + randInt(rng, 1, 9);
  const answer = a * b;

  const distractors = new Set<number>();
  while (distractors.size < 3) {
    const delta = randInt(rng, 1, 4) * (rng() < 0.5 ? -1 : 1) * a;
    const candidate = answer + delta;
    if (candidate !== answer && candidate > 0) distractors.add(candidate);
  }

  return {
    prompt: `${a} × ${b}`,
    answer,
    choices: shuffle(rng, [answer, ...distractors]),
  };
}

export function isCorrect(challenge: GateChallenge, choice: number): boolean {
  return choice === challenge.answer;
}

/** How long a passed gate stays open before it must be solved again. */
export const GATE_SESSION_MS = 3 * 60 * 1000;

export function isGateStillOpen(passedAt: number | null, now: number): boolean {
  if (passedAt == null) return false;
  // A clock that moved backwards (timezone change, manual set) closes the gate
  // rather than leaving it open indefinitely.
  if (now < passedAt) return false;
  return now - passedAt < GATE_SESSION_MS;
}
