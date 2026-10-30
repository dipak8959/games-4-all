import { randInt, type Rng } from '../../util/random';

/**
 * Number Bubbles.
 *
 * Bubbles float up the screen, each with a number in it, and a target sits
 * at the top. Tap the bubbles that make the target — two that add up to it,
 * at first — and they pop. Tap one again to let it go.
 *
 * It practises number bonds: seeing which numbers go together to make
 * another, fast enough to catch them before they float away (they come back
 * round, so nothing is lost by waiting). It grows with the player: bigger
 * numbers, three to add instead of two, then two to take away, then two to
 * times together — with more bubbles, floating faster.
 *
 * Kind like everything else: bubbles that go over the target, or don't make
 * it, just float free again. Eight targets is the round, fixed before the
 * first bubble rises. There's no score: the stars come from how few slips.
 */

export const FIELD_WIDTH = 320;
export const FIELD_HEIGHT = 480;
/** Big enough for a small finger on any phone. */
export const BUBBLE = 42;
export const TARGETS = 8;
/** The three columns bubbles rise in. */
export const COLUMNS = [58, 160, 262] as const;
/** How long "made it" or "too much" shows. */
export const SHOW = 0.8;
const TOP = 70;
const LOOP = FIELD_HEIGHT - TOP + BUBBLE * 2;

export type Kind = 'add' | 'add3' | 'take' | 'times';
export const KINDS: readonly Kind[] = ['add', 'add3', 'take', 'times'];

export type Bubble = {
  readonly id: number;
  readonly value: number;
  readonly column: number;
  /** How far round its column's loop, from the bottom. */
  readonly rise: number;
  readonly phase: number;
  /** Just popped: its place in the column stays empty until it comes
   *  round to the bottom again, with a new number. */
  readonly hidden: boolean;
};

export type NumberBubblesState = {
  readonly kind: Kind;
  readonly low: number;
  readonly high: number;
  readonly most: number;
  readonly speed: number;
  readonly columnSpeed: readonly number[];
  readonly bubbles: readonly Bubble[];
  readonly target: number;
  readonly picked: readonly number[];
  readonly made: number;
  readonly slips: number;
  readonly said: 'made' | 'over' | null;
  readonly saidFor: number;
  readonly nextId: number;
  readonly time: number;
  readonly complete: boolean;
};

type LevelSpec = {
  readonly kind: Kind;
  /** Numbers in the bubbles run from low to high. */
  readonly low: number;
  readonly high: number;
  /** The biggest target. */
  readonly most: number;
  readonly bubbles: number;
  readonly speed: number;
};

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [
  { kind: 'add', low: 1, high: 4, most: 5, bubbles: 6, speed: 18 },
  { kind: 'add', low: 1, high: 9, most: 10, bubbles: 6, speed: 22 },
  { kind: 'add', low: 2, high: 15, most: 20, bubbles: 7, speed: 26 },
  { kind: 'add3', low: 1, high: 9, most: 20, bubbles: 8, speed: 30 },
  { kind: 'take', low: 1, high: 20, most: 19, bubbles: 8, speed: 34 },
  { kind: 'times', low: 2, high: 10, most: 100, bubbles: 9, speed: 38 },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

/** How many bubbles make a target. */
export function needs(kind: Kind): number {
  return kind === 'add3' ? 3 : 2;
}

/** What some numbers make, by this level's sum. */
export function makes(kind: Kind, values: readonly number[]): number {
  if (kind === 'take') return Math.abs(values[0] - values[1]);
  if (kind === 'times') return values.reduce((a, b) => a * b, 1);
  return values.reduce((a, b) => a + b, 0);
}

/** Every set of bubbles (by index) the right size, for choosing a target. */
function combinations(n: number, size: number): number[][] {
  const out: number[][] = [];
  const pick = (from: number, chosen: number[]) => {
    if (chosen.length === size) {
      out.push(chosen);
      return;
    }
    for (let i = from; i < n; i += 1) pick(i + 1, [...chosen, i]);
  };
  pick(0, []);
  return out;
}

/** What some of these bubbles could make, within the level. */
function targetsFrom(state: NumberBubblesState, pool: readonly Bubble[], again: boolean): number[] {
  return combinations(pool.length, needs(state.kind))
    .map((c) => makes(state.kind, c.map((i) => pool[i].value)))
    .filter((t) => t >= 1 && t <= state.most && (again || t !== state.target));
}

/** A target that some bubbles really do make — ones on the screen now if
 *  it can be, or else with the new ones still to come round; a new target
 *  if there is one, the same again if not. */
function chooseTarget(state: NumberBubblesState, rng: Rng): NumberBubblesState {
  for (let tries = 0; tries < 60; tries += 1) {
    const shown = state.bubbles.filter((b) => !b.hidden);
    const options = [
      targetsFrom(state, shown, false),
      targetsFrom(state, state.bubbles, false),
      targetsFrom(state, shown, true),
      targetsFrom(state, state.bubbles, true),
    ].find((o) => o.length);
    if (options) return { ...state, target: options[randInt(rng, 0, options.length - 1)] };
    // Nothing fits: fresh numbers, a bubble at a time, for the new ones
    // still to come round, or else those lowest down.
    const order = [...state.bubbles].sort((a, b) => Number(b.hidden) - Number(a.hidden) || a.rise - b.rise);
    const redo = order[tries % Math.min(order.length, needs(state.kind) + 1)].id;
    state = { ...state, bubbles: state.bubbles.map((b) => (b.id === redo ? { ...b, value: randInt(rng, state.low, state.high) } : b)) };
  }
  const size = needs(state.kind);
  return { ...state, target: makes(state.kind, state.bubbles.slice(0, size).map((b) => b.value)) };
}

export function createGame(rng: Rng, level: number): NumberBubblesState {
  const spec = specForLevel(level);
  const bubbles: Bubble[] = [];
  for (let i = 0; i < spec.bubbles; i += 1) {
    const column = i % COLUMNS.length;
    const inColumn = Math.ceil((spec.bubbles - column) / COLUMNS.length);
    const slot = Math.floor(i / COLUMNS.length);
    bubbles.push({ id: i, value: randInt(rng, spec.low, spec.high), column, rise: ((slot + rng() * 0.3) * LOOP) / inColumn, phase: rng() * Math.PI * 2, hidden: false });
  }
  const state: NumberBubblesState = {
    kind: spec.kind,
    low: spec.low,
    high: spec.high,
    most: spec.most,
    speed: spec.speed,
    columnSpeed: COLUMNS.map(() => spec.speed * (0.85 + rng() * 0.3)),
    bubbles,
    target: 0,
    picked: [],
    made: 0,
    slips: 0,
    said: null,
    saidFor: 0,
    nextId: spec.bubbles,
    time: 0,
    complete: false,
  };
  return chooseTarget(state, rng);
}

/** Where a bubble is on the screen now. */
export function bubbleAt(state: Pick<NumberBubblesState, 'time'>, bubble: Bubble): { x: number; y: number } {
  return {
    x: COLUMNS[bubble.column] + Math.sin(state.time * 1.3 + bubble.phase) * 6,
    y: FIELD_HEIGHT + BUBBLE - bubble.rise,
  };
}

/** Tapped: picked, or let go if it already was. Enough picked, it's
 *  checked: made, or over, or not it — and the picks float free. */
export function tapBubble(state: NumberBubblesState, id: number, rng: Rng): NumberBubblesState {
  if (state.complete || !state.bubbles.some((b) => b.id === id && !b.hidden)) return state;
  if (state.picked.includes(id)) return { ...state, picked: state.picked.filter((p) => p !== id) };
  const picked = [...state.picked, id];
  const values = picked.map((p) => state.bubbles.find((b) => b.id === p)!.value);
  const sum = makes(state.kind, values);
  const adding = state.kind === 'add' || state.kind === 'add3';
  // Adding up past the target is over already, however many are picked.
  if (adding && sum > state.target) return { ...state, picked: [], slips: state.slips + 1, said: 'over', saidFor: SHOW };
  if (picked.length < needs(state.kind)) return { ...state, picked };
  if (sum !== state.target) return { ...state, picked: [], slips: state.slips + 1, said: 'over', saidFor: SHOW };
  // Made it: those bubbles pop. Each place stays empty until it comes round
  // to the bottom again, so nothing new ever lands on top of another.
  const made = state.made + 1;
  let nextId = state.nextId;
  const bubbles = state.bubbles.map((b) => {
    if (!picked.includes(b.id)) return b;
    const fresh = { ...b, id: nextId, value: randInt(rng, state.low, state.high), hidden: true };
    nextId += 1;
    return fresh;
  });
  const next = { ...state, bubbles, picked: [], made, said: 'made' as const, saidFor: SHOW, nextId };
  if (made >= TARGETS) return { ...next, complete: true };
  return chooseTarget(next, rng);
}

export function step(state: NumberBubblesState, seconds: number): NumberBubblesState {
  if (state.complete) return state;
  const dt = Math.min(seconds, 0.25);
  const saidFor = Math.max(0, state.saidFor - dt);
  return {
    ...state,
    time: state.time + dt,
    saidFor,
    said: saidFor > 0 ? state.said : null,
    // Up, and round again from the bottom — a new one showing from there.
    bubbles: state.bubbles.map((b) => {
      const rise = b.rise + state.columnSpeed[b.column] * dt;
      return rise >= LOOP ? { ...b, rise: rise - LOOP, hidden: false } : { ...b, rise };
    }),
  };
}

/** On the screen, clear of the target at the top: a finger can reach it. */
export function reachable(state: Pick<NumberBubblesState, 'time'>, bubble: Bubble): boolean {
  if (bubble.hidden) return false;
  const { y } = bubbleAt(state, bubble);
  return y > TOP + BUBBLE * 0.5 && y < FIELD_HEIGHT - BUBBLE * 0.5;
}

/** All eight with no slips is three stars; a couple, two; more, one. */
export function starsForSlips(slips: number): number {
  if (slips === 0) return 3;
  if (slips <= 2) return 2;
  return 1;
}
