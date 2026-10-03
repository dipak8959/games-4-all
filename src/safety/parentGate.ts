import { randInt, type Rng } from '../util/random';

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
};

const MIN_FACTOR = 4;
const MAX_FACTOR = 9;
const MULTIPLIER = 10;

/**
 * One digit times a two-digit number — 7 × 53 — always a three-digit answer.
 * The answer is typed, never chosen from a list: a list can be guessed, a
 * typed three-digit number can't (one try in 900), and a wrong one brings a
 * new question.
 */
export function createChallenge(rng: Rng): GateChallenge {
  const a = randInt(rng, MIN_FACTOR, MAX_FACTOR);
  const b = randInt(rng, MIN_FACTOR, MAX_FACTOR) * MULTIPLIER + randInt(rng, 1, 9);
  return { prompt: `${a} × ${b}`, answer: a * b };
}

/** How many digits the answer has, so entry can check itself when full. */
export function answerLength(challenge: GateChallenge): number {
  return String(challenge.answer).length;
}

export function isCorrect(challenge: GateChallenge, typed: number): boolean {
  return typed === challenge.answer;
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
