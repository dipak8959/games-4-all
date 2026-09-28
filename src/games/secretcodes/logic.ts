import { randInt, shuffle, type Rng } from '../../util/random';

/**
 * Secret Codes.
 *
 * A message in code: every letter moved the same number of places along the
 * alphabet. Turn the code wheel to move them back, one place at a time, and
 * read what it says. When it reads right, say so.
 *
 * It practises reading and pattern-finding: telling a real sentence from a
 * jumble at a glance, and seeing that one rule turns every letter. It grows
 * with the player: letters moved further, longer messages, and at the top,
 * only the first word turning, so the rest has to be read in the head.
 *
 * Kind like everything else: a wrong "it says this" just turns into another
 * try. Six messages is the round, fixed before the first. There's no score:
 * the stars come from how few wrong tries.
 */

export const MESSAGES_PER_ROUND = 6;

/** Friendly messages to find, grouped by length. */
export const MESSAGES: readonly (readonly string[])[] = [
  [
    'MEET AT THE TREE',
    'LOOK UNDER THE MAT',
    'THE CAKE IS READY',
    'BRING YOUR KITE',
    'WE PLAY AT FOUR',
    'FEED THE FISH',
    'THE DOG IS HAPPY',
    'SEE YOU AT LUNCH',
    'HIDE BY THE GATE',
    'THE BOX IS RED',
    'PACK A SNACK',
    'GO TO THE PARK',
  ],
  [
    'THE MAP IS IN THE BLUE BOX',
    'MEET ME BY THE BIG OAK TREE',
    'THE TREASURE IS UNDER THE BENCH',
    'BRING A TORCH AND A WARM HAT',
    'THE SECRET WORD IS PENGUIN',
    'LOOK BEHIND THE GREEN DOOR',
    'THE KEY IS UNDER THE PLANT POT',
    'WE MEET AT THE POND AT NOON',
    'THE BIRDS FLY SOUTH TODAY',
    'PUT THE NOTE IN THE RED BOOK',
    'A KIND TEAM IS A STRONG TEAM',
    'COUNT TEN STEPS FROM THE WALL',
  ],
  [
    'WALK TO THE OLD MILL AND LOOK FOR THE STONE BRIDGE',
    'THE CLUE IS WRITTEN ON THE BACK OF THE MAP',
    'WHEN THE BELL RINGS MEET BY THE LIBRARY STEPS',
    'THE PICNIC IS ON THE HILL ABOVE THE RIVER',
    'FOLLOW THE ARROWS UNTIL YOU REACH THE GARDEN',
    'THE LAST PIECE OF THE PUZZLE IS IN THE ATTIC',
    'EVERY GOOD EXPLORER CARRIES WATER AND A MAP',
    'THE SHIP LEAVES THE HARBOUR AT DAWN TOMORROW',
    'TURN LEFT AT THE FOUNTAIN AND THEN WALK NORTH',
    'THE ANSWER IS HIDDEN IN THE SECOND DRAWER',
    'OUR CLUBHOUSE PASSWORD CHANGES EVERY MONDAY',
    'THE STARS ARE BRIGHTEST FAR FROM THE CITY LIGHTS',
  ],
];

export type SecretCodesState = {
  readonly messages: readonly string[];
  readonly keys: readonly number[];
  readonly firstWordOnly: boolean;
  readonly index: number;
  /** How far the wheel has turned the letters back. */
  readonly turn: number;
  readonly mistakes: number;
  readonly read: boolean;
  readonly complete: boolean;
};

type LevelSpec = {
  /** Letters are moved at most this far. */
  readonly most: number;
  /** Which length of message: 0 short, 1 middling, 2 long. */
  readonly length: number;
  /** Only the first word turns with the wheel. */
  readonly firstWordOnly: boolean;
};

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [
  { most: 2, length: 0, firstWordOnly: false },
  { most: 5, length: 0, firstWordOnly: false },
  { most: 12, length: 1, firstWordOnly: false },
  { most: 25, length: 1, firstWordOnly: false },
  { most: 25, length: 2, firstWordOnly: false },
  { most: 25, length: 2, firstWordOnly: true },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

const A = 'A'.charCodeAt(0);

/** Every letter moved `by` places along the alphabet, round from Z to A. */
export function shift(text: string, by: number): string {
  return text.replace(/[A-Z]/g, (ch) => String.fromCharCode(A + ((((ch.charCodeAt(0) - A + by) % 26) + 26) % 26)));
}

export function createGame(rng: Rng, level: number): SecretCodesState {
  const spec = specForLevel(level);
  const messages = shuffle(rng, MESSAGES[spec.length]).slice(0, MESSAGES_PER_ROUND);
  const keys = messages.map(() => randInt(rng, 1, spec.most));
  return { messages, keys, firstWordOnly: spec.firstWordOnly, index: 0, turn: 0, mistakes: 0, read: false, complete: false };
}

export function coded(state: SecretCodesState): string {
  return shift(state.messages[state.index], state.keys[state.index]);
}

/** The message as the wheel turns it now. */
export function preview(state: SecretCodesState): string {
  const text = coded(state);
  if (!state.firstWordOnly) return shift(text, -state.turn);
  const [first, ...rest] = text.split(' ');
  return [shift(first, -state.turn), ...rest].join(' ');
}

/** Turns the wheel one place (or back one). */
export function turnWheel(state: SecretCodesState, by: 1 | -1): SecretCodesState {
  if (state.complete || state.read) return state;
  return { ...state, turn: (((state.turn + by) % 26) + 26) % 26 };
}

/** "It says this": right if the wheel undoes the code. */
export function claim(state: SecretCodesState): SecretCodesState {
  if (state.complete || state.read) return state;
  if (state.turn !== state.keys[state.index]) return { ...state, mistakes: state.mistakes + 1 };
  return { ...state, read: true };
}

/** On to the next message, once one is read. */
export function nextMessage(state: SecretCodesState): SecretCodesState {
  if (!state.read || state.complete) return state;
  const index = state.index + 1;
  if (index >= state.messages.length) return { ...state, complete: true };
  return { ...state, index, turn: 0, read: false };
}
