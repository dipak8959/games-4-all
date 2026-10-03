import { randInt, type Rng } from '../../util/random';

/**
 * Balance Scale.
 *
 * A row of coins that all look the same, but one is a little heavier. Put
 * coins on the scale's two pans and weigh them: the heavy side goes down, or
 * the pans balance and the heavy coin is one left off. Find it in as few
 * weighings as you can, then pick it out.
 *
 * It practises deduction: every weighing splits the coins three ways — left,
 * right, and off the scale — and the quickest finders make the three as even
 * as they can. It grows with the player: more coins, and more weighings to
 * plan.
 *
 * Kind like everything else: a wrong pick just rules that coin out. Six
 * puzzles is the round, fixed before the first weighing. There's no score:
 * the stars come from weighings past the fewest, and wrong picks.
 */

export const PUZZLES = 6;
export type Place = 'off' | 'left' | 'right';
export type Result = 'left' | 'right' | 'level';

export type Weighing = { readonly left: readonly number[]; readonly right: readonly number[]; readonly result: Result };

export type BalanceScaleState = {
  readonly coins: number;
  readonly heavies: readonly number[];
  readonly index: number;
  readonly places: readonly Place[];
  readonly history: readonly Weighing[];
  readonly ruledOut: readonly number[];
  /** Weighings over the fewest, and wrong picks, all round. */
  readonly extra: number;
  readonly found: boolean;
  readonly complete: boolean;
};

type LevelSpec = { readonly coins: number };

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [{ coins: 3 }, { coins: 4 }, { coins: 6 }, { coins: 9 }, { coins: 10 }, { coins: 12 }];

export function specForLevel(level: number): LevelSpec & { readonly fewest: number } {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return { ...LEVELS[index], fewest: fewestWeighings(LEVELS[index].coins) };
}

/** The fewest weighings that always find the heavy coin among n: each one
 *  splits the coins three ways. */
export function fewestWeighings(n: number): number {
  let w = 0;
  for (let reach = 1; reach < n; reach *= 3) w += 1;
  return w;
}

export function createGame(rng: Rng, level: number): BalanceScaleState {
  const { coins } = specForLevel(level);
  const heavies = Array.from({ length: PUZZLES }, () => randInt(rng, 0, coins - 1));
  return { coins, heavies, index: 0, places: Array.from({ length: coins }, () => 'off'), history: [], ruledOut: [], extra: 0, found: false, complete: false };
}

/** A coin tapped while weighing: off the scale, to the left pan, the right,
 *  and off again. */
export function movePlace(state: BalanceScaleState, coin: number): BalanceScaleState {
  if (state.complete || state.found || coin < 0 || coin >= state.coins) return state;
  const next: Place = state.places[coin] === 'off' ? 'left' : state.places[coin] === 'left' ? 'right' : 'off';
  return { ...state, places: state.places.map((p, i) => (i === coin ? next : p)) };
}

/** Puts coins exactly where they're wanted, for a player who already knows. */
export function setPlaces(state: BalanceScaleState, left: readonly number[], right: readonly number[]): BalanceScaleState {
  return { ...state, places: state.places.map((_, i) => (left.includes(i) ? 'left' : right.includes(i) ? 'right' : 'off')) };
}

/** Weighs whatever is on the pans. The heavy side goes down; with the heavy
 *  coin off the scale, the pans balance if they hold as many coins. */
export function weigh(state: BalanceScaleState): BalanceScaleState {
  if (state.complete || state.found) return state;
  const left = state.places.flatMap((p, i) => (p === 'left' ? [i] : []));
  const right = state.places.flatMap((p, i) => (p === 'right' ? [i] : []));
  if (!left.length && !right.length) return state;
  const heavy = state.heavies[state.index];
  const weight = (side: readonly number[]) => side.length * 10 + (side.includes(heavy) ? 1 : 0);
  const [l, r] = [weight(left), weight(right)];
  const result: Result = l > r ? 'left' : r > l ? 'right' : 'level';
  return { ...state, history: [...state.history, { left, right, result }], places: state.places.map(() => 'off') };
}

/** A coin picked as the heavy one. */
export function pick(state: BalanceScaleState, coin: number): BalanceScaleState {
  if (state.complete || state.found || state.ruledOut.includes(coin)) return state;
  if (coin !== state.heavies[state.index]) return { ...state, ruledOut: [...state.ruledOut, coin], extra: state.extra + 1 };
  const over = Math.max(0, state.history.length - fewestWeighings(state.coins));
  return { ...state, found: true, extra: state.extra + over };
}

/** On to the next puzzle, once the heavy coin is found. */
export function nextPuzzle(state: BalanceScaleState): BalanceScaleState {
  if (!state.found || state.complete) return state;
  const index = state.index + 1;
  if (index >= state.heavies.length) return { ...state, complete: true };
  return { ...state, index, places: state.places.map(() => 'off'), history: [], ruledOut: [], found: false };
}

/** The coins that could still be the heavy one, after the weighings so far
 *  and the wrong picks. */
export function candidates(state: Pick<BalanceScaleState, 'coins' | 'history' | 'ruledOut'>): number[] {
  const all = Array.from({ length: state.coins }, (_, i) => i).filter((c) => !state.ruledOut.includes(c));
  return all.filter((c) =>
    state.history.every((w) => {
      const weight = (side: readonly number[]) => side.length * 10 + (side.includes(c) ? 1 : 0);
      const [l, r] = [weight(w.left), weight(w.right)];
      return (l > r ? 'left' : r > l ? 'right' : 'level') === w.result;
    }),
  );
}

/** No weighings past the fewest and no wrong picks is three stars; a few,
 *  two; more, one. */
export function starsForExtra(extra: number): number {
  if (extra === 0) return 3;
  if (extra <= 3) return 2;
  return 1;
}
