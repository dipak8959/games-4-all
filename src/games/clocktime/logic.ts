import { randInt, shuffle, type Rng } from '../../util/random';

/**
 * What's the Time?
 *
 * A clock face, and a few times written underneath. Pick the one the clock
 * shows. Ten clocks and the round is over.
 *
 * It practises telling the time from an analogue clock — the way it's
 * taught: the hour first (o'clock), then half past, then the quarters, then
 * five-minute steps, then any minute at all. At the top it asks for the
 * thing people actually get wrong: when it's ten to three the short hand is
 * almost on the 3, and the answer is still 2:50.
 *
 * Kind like the other number games: a wrong pick is dimmed and costs a
 * star; the clock stays until it's read.
 */

export const CLOCKS_PER_ROUND = 10;

export type Clock = {
  readonly hour: number;
  readonly minute: number;
  /** Written times on offer; exactly one is right. */
  readonly choices: readonly string[];
  readonly answer: number;
};

export type ClockTimeState = {
  readonly clocks: readonly Clock[];
  readonly index: number;
  /** Choices ruled out on the clock being read. */
  readonly ruledOut: readonly number[];
  readonly mistakes: number;
  readonly complete: boolean;
};

type LevelSpec = {
  /** The minute hand only ever lands on multiples of this. */
  readonly step: number;
  readonly choices: number;
  /** How close the wrong answers are: 0 any hour, 1 near the right time,
   *  2 nearer still. */
  readonly near: number;
  /** Include the classic slip: reading the hour from where the short hand
   *  is nearly pointing. */
  readonly trap: boolean;
};

/** One entry per level, 1-6. */
const LEVELS: readonly LevelSpec[] = [
  { step: 60, choices: 3, near: 0, trap: false },
  { step: 30, choices: 3, near: 0, trap: false },
  { step: 15, choices: 4, near: 0, trap: false },
  { step: 5, choices: 4, near: 1, trap: false },
  { step: 1, choices: 4, near: 2, trap: false },
  { step: 1, choices: 4, near: 2, trap: true },
];

export function specForLevel(level: number): LevelSpec {
  const index = Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1;
  return LEVELS[index];
}

/** 1-12 on the face, minutes in two figures: 3:05, 12:30. */
export function formatTime(hour: number, minute: number): string {
  const h = ((((hour - 1) % 12) + 12) % 12) + 1;
  return `${h}:${String(minute).padStart(2, '0')}`;
}

const norm = (hour: number, minute: number) => {
  const total = ((hour * 60 + minute) % 720 + 720) % 720;
  return { hour: Math.floor(total / 60) || 12, minute: total % 60 };
};

function wrongTimes(rng: Rng, spec: LevelSpec, hour: number, minute: number): { hour: number; minute: number }[] {
  const out: { hour: number; minute: number }[] = [];
  const shift = (dh: number, dm: number) => out.push(norm(hour + dh, minute + dm));
  if (spec.trap && minute >= 35) {
    // Ten to three read as ten to *four* — well, as 3:50: the hour the short
    // hand is nearly on.
    shift(1, 0);
  }
  if (spec.near >= 1) {
    // The hands swapped: the minute hand read as the hour and the other way.
    const swapped = { hour: Math.round(minute / 5) || 12, minute: (hour % 12) * 5 };
    if (spec.step <= 5) out.push(norm(swapped.hour, swapped.minute));
    shift(0, spec.step <= 1 ? randInt(rng, 1, 4) * (rng() < 0.5 ? -1 : 1) : 5 * (rng() < 0.5 ? -1 : 1));
    shift(rng() < 0.5 ? -1 : 1, 0);
  }
  if (spec.near >= 2) shift(0, 30);
  // Anything else: other times at the level's step.
  for (let i = 0; i < 40; i += 1) {
    const h = randInt(rng, 1, 12);
    const m = spec.step >= 60 ? 0 : randInt(rng, 0, 60 / Math.min(spec.step, 60) - 1) * Math.min(spec.step, 60);
    out.push({ hour: h, minute: spec.step === 1 && spec.near ? minute : m });
  }
  return out;
}

function makeClock(rng: Rng, spec: LevelSpec, avoid: Set<string>): Clock {
  let hour = 1;
  let minute = 0;
  for (let tries = 0; tries < 50; tries += 1) {
    hour = randInt(rng, 1, 12);
    minute = spec.step >= 60 ? 0 : randInt(rng, 0, 60 / spec.step - 1) * spec.step;
    // The trap level leans on the times it's there to teach.
    if (spec.trap && rng() < 0.5) minute = randInt(rng, 40, 58);
    if (!avoid.has(formatTime(hour, minute))) break;
  }
  const right = formatTime(hour, minute);
  const wrong: string[] = [];
  for (const t of wrongTimes(rng, spec, hour, minute)) {
    const text = formatTime(t.hour, t.minute);
    if (text !== right && !wrong.includes(text)) wrong.push(text);
    if (wrong.length === spec.choices - 1) break;
  }
  const choices = shuffle(rng, [right, ...wrong]);
  return { hour, minute, choices, answer: choices.indexOf(right) };
}

export function createGame(rng: Rng, level: number): ClockTimeState {
  const spec = specForLevel(level);
  const seen = new Set<string>();
  const clocks = Array.from({ length: CLOCKS_PER_ROUND }, () => {
    const clock = makeClock(rng, spec, seen);
    seen.add(formatTime(clock.hour, clock.minute));
    return clock;
  });
  return { clocks, index: 0, ruledOut: [], mistakes: 0, complete: false };
}

/** Where the hands point, in degrees clockwise from 12. The hour hand moves
 *  on between the numbers as the minutes go by, the way a real one does. */
export function handAngles(hour: number, minute: number): { hour: number; minute: number } {
  return { hour: ((hour % 12) + minute / 60) * 30, minute: minute * 6 };
}

export function choose(state: ClockTimeState, choice: number): ClockTimeState {
  if (state.complete || state.ruledOut.includes(choice)) return state;
  const clock = state.clocks[state.index];
  if (choice !== clock.answer) {
    return { ...state, ruledOut: [...state.ruledOut, choice], mistakes: state.mistakes + 1 };
  }
  const index = state.index + 1;
  return { ...state, index, ruledOut: [], complete: index >= CLOCKS_PER_ROUND };
}
