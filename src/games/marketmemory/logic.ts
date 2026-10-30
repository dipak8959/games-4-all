import { shuffle, type Rng } from '../../util/random';
import type { ColorKind, ShapeKind } from '../shapes/logic';

/**
 * Market Memory — a game for a group, played as one team.
 *
 * "I went to market and I bought…": the first player puts one thing in the
 * shared bag. The next taps what's in the bag, in order, then adds one
 * more. Round the group it goes, the bag getting fuller, until it holds the
 * level's number of things.
 *
 * It practises sequence memory — and doing it together, because everyone
 * is watching and everyone is helping remember. A slip isn't anyone's
 * fault and isn't the end: the bag is shown, the player carries on from
 * where they were, and the team loses a star, not the round.
 *
 * It grows with the team: a fuller bag, more things on the shelf, a shelf
 * that's shuffled between turns (so it's the things that are remembered,
 * not where they sat), and things that look more alike.
 */

const SHAPES: readonly ShapeKind[] = ['circle', 'square', 'triangle', 'star', 'diamond', 'heart'];
const COLORS: readonly ColorKind[] = ['berry', 'sky', 'leaf', 'sun', 'grape'];

/** A thing on the shelf: a shape, plain or in a box, in a colour. No two
 *  things share both shape and box — colour is never all that tells them
 *  apart. */
export type Item = { readonly shape: ShapeKind; readonly boxed: boolean; readonly color: ColorKind };

export type Phase = 'recall' | 'add';

export type MarketMemoryState = {
  readonly items: readonly Item[];
  /** The order the shelf is shown in, by item index. */
  readonly shelf: readonly number[];
  readonly bag: readonly number[];
  readonly players: number;
  readonly turn: number;
  readonly phase: Phase;
  /** How far through the bag this turn's player has got. */
  readonly recalled: number;
  /** The bag is on show after a slip, until the player's ready. */
  readonly peeking: boolean;
  readonly target: number;
  readonly shuffleShelf: boolean;
  readonly mistakes: number;
  readonly complete: boolean;
};

type LevelSpec = {
  /** Things in the bag to finish. */
  readonly target: number;
  /** Things on the shelf to choose from. */
  readonly shelf: number;
  readonly shuffleShelf: boolean;
  /** A shape and its boxed twin in the same colour. */
  readonly twins: boolean;
};

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [
  { target: 4, shelf: 6, shuffleShelf: false, twins: false },
  { target: 6, shelf: 8, shuffleShelf: false, twins: false },
  { target: 7, shelf: 9, shuffleShelf: false, twins: false },
  { target: 8, shelf: 10, shuffleShelf: true, twins: false },
  { target: 10, shelf: 11, shuffleShelf: true, twins: true },
  { target: 12, shelf: 12, shuffleShelf: true, twins: true },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

export const COLOR_WORDS: Record<ColorKind, string> = {
  berry: 'orange',
  sky: 'blue',
  leaf: 'green',
  sun: 'yellow',
  grape: 'pink',
};

export function describeItem(item: Item): string {
  return `${COLOR_WORDS[item.color]} ${item.shape}${item.boxed ? ' in a box' : ''}`;
}

function makeItems(rng: Rng, spec: LevelSpec): Item[] {
  const shapes = shuffle(rng, SHAPES);
  const colors = shuffle(rng, COLORS);
  const items: Item[] = shapes.map((shape, i) => ({ shape, boxed: false, color: colors[i % colors.length] }));
  // Past six, the boxed twins of the first shapes join the shelf — in a
  // different colour while that's a help, the same colour when it isn't.
  for (let i = 0; items.length < spec.shelf; i += 1) {
    const plain = items[i];
    const color = spec.twins ? plain.color : colors[(i + 2) % colors.length];
    items.push({ shape: plain.shape, boxed: true, color });
  }
  return items;
}

export function createGame(rng: Rng, level: number, players: number): MarketMemoryState {
  const spec = specForLevel(level);
  const items = makeItems(rng, spec);
  return {
    items,
    shelf: shuffle(rng, items.map((_, i) => i)),
    bag: [],
    players: Math.max(1, players),
    turn: 0,
    // The first player has nothing to remember yet: straight to adding.
    phase: 'add',
    recalled: 0,
    peeking: false,
    target: spec.target,
    shuffleShelf: spec.shuffleShelf,
    mistakes: 0,
    complete: false,
  };
}

/** A tap on something on the shelf. */
export function pickItem(state: MarketMemoryState, item: number, rng: Rng): MarketMemoryState {
  if (state.complete || state.peeking || item < 0 || item >= state.items.length) return state;
  if (state.phase === 'recall') {
    if (item !== state.bag[state.recalled]) return { ...state, mistakes: state.mistakes + 1, peeking: true };
    const recalled = state.recalled + 1;
    return recalled >= state.bag.length ? { ...state, recalled, phase: 'add' } : { ...state, recalled };
  }
  const bag = [...state.bag, item];
  if (bag.length >= state.target) return { ...state, bag, complete: true };
  return {
    ...state,
    bag,
    turn: (state.turn + 1) % state.players,
    phase: 'recall',
    recalled: 0,
    shelf: state.shuffleShelf ? shuffle(rng, state.shelf) : state.shelf,
  };
}

/** Seen the bag after a slip: carry on from where they were. */
export function stopPeeking(state: MarketMemoryState): MarketMemoryState {
  return state.peeking ? { ...state, peeking: false } : state;
}
