import { type Rng } from '../../util/random';

/**
 * Ski Slalom.
 *
 * A skier heads down the mountain on their own; hold left or right to
 * carve across the slope, and pass between each pair of flags on the way to
 * the finish. The slope keeps coming, so the trick is to look ahead: start
 * the turn for the next gate before this one is gone.
 *
 * It practises steering and looking ahead — carving takes a moment to get
 * going and a moment to stop, so the turn has to start early. It grows with
 * the player: more gates, narrower gates, a faster run, gates further across
 * from each other and closer together, then trees to steer clear of.
 *
 * Kind like everything else: a missed gate is only missed — the flags say
 * so, and on the skier goes — and a tree is a tumble, up again at once. The
 * finish is fixed before the start. There's no score: the stars come from
 * gates missed and tumbles.
 */

export const FIELD_WIDTH = 320;
export const FIELD_HEIGHT = 480;
/** The skier stays this far down the view; the slope scrolls past. */
export const SKIER_Y = 150;
export const SKIER_HALF = 9;
export const TREE = 13;
/** How hard carving pushes across, how fast across at most, and how
 *  quickly letting go straightens out. */
export const CARVE = 600;
export const MAX_ACROSS = 170;
export const STRAIGHTEN = 700;
/** How long a tumble keeps the skier down. */
export const TUMBLE = 0.9;
const FIRST = 420;
const RUN_OUT = 260;
const MARGIN = 24;

export type Gate = { readonly y: number; readonly x: number };
export type Tree = { readonly y: number; readonly x: number };
export type Steer = -1 | 0 | 1;
export type Through = 'in' | 'missed';

export type SkiSlalomState = {
  readonly speed: number;
  readonly gateWidth: number;
  readonly gates: readonly Gate[];
  readonly trees: readonly Tree[];
  readonly length: number;
  /** How far down the slope the skier is. */
  readonly down: number;
  readonly x: number;
  readonly vx: number;
  readonly steer: Steer;
  /** How each gate went, in order, as the skier reaches it. */
  readonly through: readonly Through[];
  readonly tumbles: number;
  /** Seconds left of a tumble. */
  readonly tumbling: number;
  /** The tree the skier last hit — it isn't hit again on the way past. */
  readonly lastTree: number;
  readonly started: boolean;
  readonly complete: boolean;
};

type LevelSpec = {
  readonly gates: number;
  readonly gateWidth: number;
  readonly speed: number;
  /** How far across the next gate is, as a share of how far the skier can
   *  carve before reaching it. */
  readonly swing: number;
  readonly spacing: number;
  /** Trees beside each stretch between gates. */
  readonly trees: number;
};

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [
  { gates: 8, gateWidth: 110, speed: 110, swing: 0.3, spacing: 200, trees: 0 },
  { gates: 10, gateWidth: 96, speed: 125, swing: 0.42, spacing: 190, trees: 0 },
  { gates: 12, gateWidth: 84, speed: 140, swing: 0.52, spacing: 180, trees: 1 },
  { gates: 14, gateWidth: 74, speed: 155, swing: 0.6, spacing: 170, trees: 1 },
  { gates: 16, gateWidth: 66, speed: 170, swing: 0.66, spacing: 160, trees: 2 },
  { gates: 18, gateWidth: 58, speed: 185, swing: 0.7, spacing: 150, trees: 2 },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

/** How far across the skier can carve, from straight, in `seconds`. */
export function carveReach(seconds: number): number {
  const ramp = MAX_ACROSS / CARVE;
  if (seconds <= ramp) return 0.5 * CARVE * seconds * seconds;
  return 0.5 * CARVE * ramp * ramp + MAX_ACROSS * (seconds - ramp);
}

export function createGame(rng: Rng, level: number): SkiSlalomState {
  const spec = specForLevel(level);
  const reach = spec.swing * carveReach(spec.spacing / spec.speed);
  const half = spec.gateWidth / 2;
  const lo = MARGIN + half;
  const hi = FIELD_WIDTH - MARGIN - half;
  const gates: Gate[] = [];
  const trees: Tree[] = [];
  for (let i = 0; i < spec.gates; i += 1) {
    const from = i === 0 ? FIELD_WIDTH / 2 : gates[i - 1].x;
    const side = rng() < 0.5 ? -1 : 1;
    const by = reach * (0.5 + rng() * 0.5);
    let x = from + side * by;
    if (x < lo || x > hi) x = from - side * by;
    gates.push({ y: FIRST + i * spec.spacing, x: Math.max(lo, Math.min(hi, x)) });
  }
  // Trees only outside the corridor between one gate and the next, so a
  // skier heading for the gate never meets one.
  for (let i = 0; i < gates.length; i += 1) {
    const a = i === 0 ? { x: FIELD_WIDTH / 2, y: FIRST - spec.spacing } : gates[i - 1];
    const b = gates[i];
    const left = Math.min(a.x, b.x) - half - TREE - 26;
    const right = Math.max(a.x, b.x) + half + TREE + 26;
    for (let t = 0; t < spec.trees; t += 1) {
      const sides = [left > TREE + 4 ? 'left' : null, right < FIELD_WIDTH - TREE - 4 ? 'right' : null].filter(Boolean);
      if (!sides.length) break;
      const side = sides[Math.floor(rng() * sides.length)];
      const x = side === 'left' ? TREE + 4 + rng() * (left - TREE - 4) : right + rng() * (FIELD_WIDTH - TREE - 4 - right);
      const y = a.y + 40 + rng() * (b.y - a.y - 80);
      trees.push({ x, y });
    }
  }
  return {
    speed: spec.speed,
    gateWidth: spec.gateWidth,
    gates,
    trees,
    length: gates[gates.length - 1].y + RUN_OUT,
    down: 0,
    x: FIELD_WIDTH / 2,
    vx: 0,
    steer: 0,
    through: [],
    tumbles: 0,
    tumbling: 0,
    lastTree: -1,
    started: false,
    complete: false,
  };
}

/** A carving button held or let go. The first press pushes off. */
export function setSteer(state: SkiSlalomState, steer: Steer): SkiSlalomState {
  if (state.complete) return state;
  if (state.steer === steer && state.started) return state;
  return { ...state, steer, started: state.started || steer !== 0 };
}

/** Pushes off without carving. */
export function start(state: SkiSlalomState): SkiSlalomState {
  return state.started || state.complete ? state : { ...state, started: true };
}

export function step(state: SkiSlalomState, seconds: number): SkiSlalomState {
  if (state.complete || !state.started) return state;
  let next = state;
  let left = Math.min(seconds, 0.25);
  while (left > 0 && !next.complete) {
    const dt = Math.min(left, 1 / 240);
    next = tick(next, dt);
    left -= dt;
  }
  return next;
}

function tick(state: SkiSlalomState, dt: number): SkiSlalomState {
  const tumbling = Math.max(0, state.tumbling - dt);
  // Down the slope — slowly while getting up from a tumble.
  const down = state.down + state.speed * (state.tumbling > 0 ? 0.35 : 1) * dt;
  let vx = state.vx;
  if (state.tumbling > 0) vx = 0;
  else if (state.steer !== 0) vx = Math.max(-MAX_ACROSS, Math.min(MAX_ACROSS, vx + state.steer * CARVE * dt));
  else vx = Math.sign(vx) * Math.max(0, Math.abs(vx) - STRAIGHTEN * dt);
  let x = state.x + vx * dt;
  if (x < SKIER_HALF) {
    x = SKIER_HALF;
    vx = 0;
  } else if (x > FIELD_WIDTH - SKIER_HALF) {
    x = FIELD_WIDTH - SKIER_HALF;
    vx = 0;
  }

  // A gate reached: through it, or past it.
  let through = state.through;
  const gate = state.gates[through.length];
  if (gate && down >= gate.y) {
    through = [...through, Math.abs(x - gate.x) <= state.gateWidth / 2 - SKIER_HALF / 2 ? 'in' : 'missed'];
  }

  // A tree: a tumble.
  let { tumbles, lastTree } = state;
  let tumble = tumbling;
  if (state.tumbling <= 0) {
    const hit = state.trees.findIndex((t, i) => i !== lastTree && Math.abs(t.y - down) < TREE && Math.abs(t.x - x) < TREE + SKIER_HALF);
    if (hit >= 0) {
      tumbles += 1;
      lastTree = hit;
      tumble = TUMBLE;
      vx = 0;
    }
  }

  const complete = down >= state.length;
  return { ...state, down: complete ? state.length : down, x, vx, through, tumbles, tumbling: tumble, lastTree, complete };
}

export function missed(state: SkiSlalomState): number {
  return state.through.filter((t) => t === 'missed').length;
}

/** Every gate and no tumbles, three stars; a couple of slips, two; more, one. */
export function starsForRun(state: SkiSlalomState): number {
  const slips = missed(state) + state.tumbles;
  if (slips === 0) return 3;
  if (slips <= 2) return 2;
  return 1;
}
