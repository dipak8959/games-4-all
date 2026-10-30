/**
 * Tower of Hanoi.
 *
 * A stack of discs on the left-hand peg, biggest at the bottom. Move the
 * whole stack to the right-hand peg: tap a peg to lift its top disc, and tap
 * another to put it down. One disc at a time, and never a bigger disc on a
 * smaller one.
 *
 * It practises planning ahead: to move a big disc, every smaller one has to
 * be out of the way first, and where they go decides how long it all takes.
 * It grows with the player: more discs, and fewer spare moves for three
 * stars.
 *
 * Kind like everything else: a disc that can't go where it's put just goes
 * back, and a tower that has taken far too many moves finishes itself. Two
 * towers is the round, fixed before the first move. There's no score: the
 * stars come from moves against the fewest a tower can take.
 */

export const TOWERS = 2;
export const PEGS = 3;

export type HanoiState = {
  readonly discs: number;
  readonly allowance: number;
  /** Each peg's discs, bottom to top; 1 is the smallest. */
  readonly pegs: readonly (readonly number[])[];
  /** The peg whose top disc is lifted, or null. */
  readonly held: number | null;
  readonly tower: number;
  readonly moves: number;
  readonly totalMoves: number;
  readonly slips: number;
  /** "That disc is too big for there", for a moment. */
  readonly slipped: boolean;
  readonly done: boolean;
  readonly complete: boolean;
};

type LevelSpec = {
  readonly discs: number;
  /** Three stars for moves within this many times the fewest. */
  readonly allowance: number;
};

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [
  { discs: 3, allowance: 2 },
  { discs: 4, allowance: 2 },
  { discs: 4, allowance: 1.5 },
  { discs: 5, allowance: 1.5 },
  { discs: 5, allowance: 1.2 },
  { discs: 6, allowance: 1.2 },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

/** The fewest moves for a stack of this many discs. */
export function fewest(discs: number): number {
  return 2 ** discs - 1;
}

/** Past this many moves on a tower, it finishes itself. */
export function mostMoves(discs: number): number {
  return fewest(discs) * 3 + 10;
}

function stack(discs: number): number[][] {
  return [Array.from({ length: discs }, (_, i) => discs - i), [], []];
}

export function createGame(_rng: unknown, level: number): HanoiState {
  const spec = specForLevel(level);
  return {
    discs: spec.discs,
    allowance: spec.allowance,
    pegs: stack(spec.discs),
    held: null,
    tower: 0,
    moves: 0,
    totalMoves: 0,
    slips: 0,
    slipped: false,
    done: false,
    complete: false,
  };
}

const top = (peg: readonly number[]): number | undefined => peg[peg.length - 1];

/** A peg tapped: lift its top disc, put the lifted one down on it, or — if
 *  it's the peg the disc came from — put it back. */
export function tapPeg(state: HanoiState, peg: number): HanoiState {
  if (state.complete || state.done || peg < 0 || peg >= PEGS) return state;
  if (state.held == null) {
    if (!state.pegs[peg].length) return { ...state, slipped: false };
    return { ...state, held: peg, slipped: false };
  }
  if (peg === state.held) return { ...state, held: null };
  const disc = top(state.pegs[state.held]) as number;
  const under = top(state.pegs[peg]);
  if (under != null && under < disc) return { ...state, held: null, slips: state.slips + 1, slipped: true };
  const pegs = state.pegs.map((p, i) => (i === state.held ? p.slice(0, -1) : i === peg ? [...p, disc] : p));
  const moves = state.moves + 1;
  const finished = pegs[PEGS - 1].length === state.discs;
  if (finished || moves >= mostMoves(state.discs)) {
    return { ...state, pegs: [[], [], stack(state.discs)[0]], held: null, moves, totalMoves: state.totalMoves + moves, done: true };
  }
  return { ...state, pegs, held: null, moves };
}

/** On to the next tower, once one is moved. */
export function nextTower(state: HanoiState): HanoiState {
  if (!state.done || state.complete) return state;
  const tower = state.tower + 1;
  if (tower >= TOWERS) return { ...state, complete: true };
  return { ...state, tower, pegs: stack(state.discs), moves: 0, done: false, slipped: false };
}

/** Moves within the allowance of the fewest is three stars; within twice
 *  that, two; more, one. */
export function starsForMoves(state: Pick<HanoiState, 'totalMoves' | 'discs' | 'allowance'>): number {
  const least = fewest(state.discs) * TOWERS;
  if (state.totalMoves <= least * state.allowance) return 3;
  if (state.totalMoves <= least * state.allowance * 2) return 2;
  return 1;
}

/** The classic way round: every move, in order, for n discs from one peg
 *  to another. */
export function solution(discs: number, from = 0, to = PEGS - 1, spare = 1): [number, number][] {
  if (discs === 0) return [];
  return [...solution(discs - 1, from, spare, to), [from, to], ...solution(discs - 1, spare, to, from)];
}
