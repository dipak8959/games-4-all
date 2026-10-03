/**
 * Echo Beat — a game for a group, played as one team.
 *
 * One player taps a beat on the drum. The drum plays it back — it lights up
 * on every beat — and the next player copies it. Then it's their turn to
 * make a beat for the player after them. Eight rhythms echoed and the
 * round is over.
 *
 * It practises rhythm: keeping the gaps between beats, long and short, the
 * way call-and-response clapping games in every playground do. The drum
 * shows the beat as light, not sound, so it can be played anywhere, and at
 * the gentlest levels a row of marks shows the beat's pattern as well.
 *
 * Kind like everything else: a copy that's off is shown again and tried
 * again, three goes at most, then the team moves on. It grows with the
 * team: longer beats, a closer copy needed, and no marks to help.
 */

export const ECHOES_PER_ROUND = 8;
export const TRIES_PER_BEAT = 3;
/** The shortest and longest gaps a beat can have, in milliseconds. */
export const MIN_GAP = 120;
export const MAX_GAP = 1500;
/** However tight the level, a gap this close is always close enough. */
const SLACK = 90;

export type Phase = 'make' | 'show' | 'copy';

export type EchoBeatState = {
  readonly beats: number;
  readonly tolerance: number;
  /** Marks showing the beat's pattern. */
  readonly marks: boolean;
  readonly players: number;
  /** Who's making the beat, and who's copying it. */
  readonly maker: number;
  readonly phase: Phase;
  /** The beat to copy, as times from its first tap, in milliseconds. */
  readonly pattern: readonly number[];
  /** Taps so far in this make or copy, as raw times. */
  readonly taps: readonly number[];
  readonly tries: number;
  readonly echoes: number;
  readonly mistakes: number;
  /** How the last copy went, for the screen to say. */
  readonly last: 'match' | 'miss' | 'moved-on' | null;
  readonly complete: boolean;
};

type LevelSpec = {
  readonly beats: number;
  /** How far off each gap may be, as a share of the gap. */
  readonly tolerance: number;
  readonly marks: boolean;
};

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [
  { beats: 3, tolerance: 0.45, marks: true },
  { beats: 4, tolerance: 0.4, marks: true },
  { beats: 4, tolerance: 0.33, marks: true },
  { beats: 5, tolerance: 0.3, marks: false },
  { beats: 5, tolerance: 0.25, marks: false },
  { beats: 6, tolerance: 0.2, marks: false },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

export function createGame(level: number, players: number): EchoBeatState {
  const spec = specForLevel(level);
  return {
    ...spec,
    players: Math.max(2, players),
    maker: 0,
    phase: 'make',
    pattern: [],
    taps: [],
    tries: 0,
    echoes: 0,
    mistakes: 0,
    last: null,
    complete: false,
  };
}

export function copier(state: EchoBeatState): number {
  return (state.maker + 1) % state.players;
}

/** Taps as a beat: times from the first, with every gap kept within reach. */
export function toPattern(taps: readonly number[]): number[] {
  const out = [0];
  for (let i = 1; i < taps.length; i += 1) {
    const gap = Math.max(MIN_GAP, Math.min(MAX_GAP, taps[i] - taps[i - 1]));
    out.push(out[i - 1] + gap);
  }
  return out;
}

const gaps = (times: readonly number[]) => times.slice(1).map((t, i) => t - times[i]);

/** Is a copy close enough? Every gap within the level's share of the
 *  original's, or within a small fixed slack for short gaps. */
export function matches(pattern: readonly number[], copy: readonly number[], tolerance: number): boolean {
  if (copy.length !== pattern.length) return false;
  const want = gaps(pattern);
  const got = gaps(copy);
  return want.every((g, i) => Math.abs(got[i] - g) <= Math.max(g * tolerance, SLACK));
}

/** A tap on the drum, at a time in milliseconds. */
export function tapDrum(state: EchoBeatState, at: number): EchoBeatState {
  if (state.complete || state.phase === 'show') return state;
  const taps = [...state.taps, at];
  if (taps.length < state.beats) return { ...state, taps };

  if (state.phase === 'make') {
    return { ...state, pattern: toPattern(taps), taps: [], phase: 'show', tries: 0, last: null };
  }

  // A copy, finished.
  if (matches(state.pattern, toPattern(taps), state.tolerance)) return next(state, 'match');
  const tries = state.tries + 1;
  const mistakes = state.mistakes + 1;
  if (tries >= TRIES_PER_BEAT) return next({ ...state, mistakes }, 'moved-on');
  return { ...state, taps: [], tries, mistakes, phase: 'show', last: 'miss' };
}

/** The copier becomes the next maker. */
function next(state: EchoBeatState, last: 'match' | 'moved-on'): EchoBeatState {
  const echoes = state.echoes + 1;
  return {
    ...state,
    echoes,
    maker: copier(state),
    phase: 'make',
    pattern: [],
    taps: [],
    tries: 0,
    last,
    complete: echoes >= ECHOES_PER_ROUND,
  };
}

/** The drum has played the beat back: over to the copier. */
export function shown(state: EchoBeatState): EchoBeatState {
  return state.phase === 'show' ? { ...state, phase: 'copy', taps: [] } : state;
}
