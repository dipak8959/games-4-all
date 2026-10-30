import { randInt, type Rng } from '../../util/random';

/**
 * Angle Judge.
 *
 * A line fixed at a point, and a second line to turn. The angle wanted is
 * written up top — 90°, 135°, 40° — and there's no protractor: turn the line
 * to where it looks right by eye, then set it. Then see how close it was.
 *
 * It practises estimating angles: knowing a right angle, halving and
 * thirding it in your head, and building bigger angles from smaller. It
 * grows with the player: angles in finer steps, less room either side, the
 * fixed line no longer flat, and angles past a half turn.
 *
 * Kind like everything else: an angle that's off is shown where it should
 * have been, then the next. Ten angles is the round, fixed before the
 * first. There's no score: the stars come from how few were off.
 */

export const ANGLES = 10;

export type AngleJudgeState = {
  readonly tolerance: number;
  readonly targets: readonly number[];
  /** How far the fixed line is turned from flat, per angle. */
  readonly bases: readonly number[];
  readonly index: number;
  /** The turning line's angle from the fixed one, in degrees. */
  readonly aim: number;
  readonly misses: number;
  /** The angle just set, and whether it was near enough — shown until next. */
  readonly result: { readonly set: number; readonly near: boolean } | null;
  readonly complete: boolean;
};

type LevelSpec = {
  /** Angles are multiples of this. */
  readonly step: number;
  /** Near enough is within this either side. */
  readonly tolerance: number;
  readonly turnedBase: boolean;
  /** The biggest angle asked for. */
  readonly most: number;
};

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [
  { step: 45, tolerance: 12, turnedBase: false, most: 180 },
  { step: 30, tolerance: 10, turnedBase: false, most: 180 },
  { step: 15, tolerance: 8, turnedBase: false, most: 180 },
  { step: 10, tolerance: 6, turnedBase: false, most: 180 },
  { step: 5, tolerance: 5, turnedBase: true, most: 180 },
  { step: 5, tolerance: 4, turnedBase: true, most: 355 },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

export function createGame(rng: Rng, level: number): AngleJudgeState {
  const spec = specForLevel(level);
  const targets: number[] = [];
  for (let i = 0; i < ANGLES; i += 1) {
    let t = 0;
    // Never flat (0° or 180°) — nothing to judge — and never twice running.
    for (let tries = 0; tries < 50 && (t <= 0 || t >= spec.most || t === 180 || t === targets[targets.length - 1]); tries += 1) {
      t = randInt(rng, 1, Math.floor(spec.most / spec.step)) * spec.step;
    }
    targets.push(t);
  }
  const bases = targets.map(() => (spec.turnedBase ? randInt(rng, 1, 11) * 30 : 0));
  return { tolerance: spec.tolerance, targets, bases, index: 0, aim: 0, misses: 0, result: null, complete: false };
}

/** Turns the line to an angle (from the fixed line, anticlockwise). */
export function aimAt(state: AngleJudgeState, degrees: number): AngleJudgeState {
  if (state.complete || state.result) return state;
  return { ...state, aim: ((Math.round(degrees) % 360) + 360) % 360 };
}

/** How far apart two angles are, the short way round. */
export function apart(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}

/** Sets the line where it is: near enough, or off. */
export function setAngle(state: AngleJudgeState): AngleJudgeState {
  if (state.complete || state.result) return state;
  const near = apart(state.aim, state.targets[state.index]) <= state.tolerance;
  return { ...state, result: { set: state.aim, near }, misses: state.misses + (near ? 0 : 1) };
}

/** On to the next angle. */
export function nextAngle(state: AngleJudgeState): AngleJudgeState {
  if (!state.result || state.complete) return state;
  const index = state.index + 1;
  if (index >= state.targets.length) return { ...state, complete: true };
  return { ...state, index, aim: 0, result: null };
}
