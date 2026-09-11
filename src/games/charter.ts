import { GAMES_META, type GameProposal } from './catalog';

/**
 * The charter: what a game has to be to belong in this app, and the gate
 * that checks it.
 *
 * These rules already existed — scattered across SAFETY.md's prose,
 * `scripts/check-safety.mjs`, and three test files. That was fine for
 * catching a rule broken in code, and useless for the moment it actually
 * matters: someone brainstorming a game that should never be built. A rule
 * you only discover you have broken after building the thing is a rule you
 * apply late and expensively.
 *
 * So this file is the single list, and `reviewProposal` runs it against an
 * idea written down in `GameProposal` form, before any code exists. A
 * shipped game is a passed proposal by construction — `GameMeta` is
 * `GameProposal` plus presentation — so `tests/charter.test.ts` runs this
 * same gate over the whole live catalogue on every CI run. The gate cannot
 * quietly rot into a document nobody applies, because the seven games we
 * already ship are its fixtures.
 *
 * What it cannot do is replace judgement. Checks marked `ask` raise a
 * question for a person; only `blocks` findings are refusals.
 */

export type PrincipleId =
  | 'OFFLINE'
  | 'NOTHING_TO_SELL'
  | 'IT_ENDS'
  | 'NOTHING_TO_LOSE'
  | 'NOTHING_TO_CHASE'
  | 'WORTH_THE_TIME'
  | 'HONEST_AGE'
  | 'ORIGINAL'
  | 'PLAYS_WITHOUT_READING'
  | 'REACHABLE_BY_A_CHILD';

export type Principle = {
  readonly id: PrincipleId;
  /** The rule, in one sentence a person can hold in their head. */
  readonly rule: string;
  /** Why it exists — the harm it is there to prevent. */
  readonly why: string;
  /**
   * Where it is enforced. `idea` runs here, on a proposal. `build` cannot be
   * judged from an idea and is caught later by the safety gate or the test
   * suite; it is listed anyway so the charter is the whole list rather than
   * the automatable half of it.
   */
  readonly enforcedAt: 'idea' | 'build' | 'both';
};

export const PRINCIPLES: readonly Principle[] = [
  {
    id: 'OFFLINE',
    rule: 'It works with nothing connected, and reaches nothing outside the device.',
    why: 'Nothing arrives from outside, so there is nothing to moderate and no channel to misuse.',
    enforcedAt: 'build',
  },
  {
    id: 'NOTHING_TO_SELL',
    rule: 'No ads, purchases, accounts, analytics, third-party SDKs or device permissions.',
    why: 'Collect nothing and there is no data to mishandle. A child is not the product.',
    enforcedAt: 'build',
  },
  {
    id: 'IT_ENDS',
    rule: 'A round ends on its own, at a point fixed before it started.',
    why: 'An endless game is one a child is always mid-something in, so every moment is a bad moment to stop. This is the single strongest safeguard against a game being hard to put down.',
    enforcedAt: 'both',
  },
  {
    id: 'NOTHING_TO_LOSE',
    rule: 'No timers, no lives, no game-over. A wrong answer nudges and you try again.',
    why: 'Losing turns play into pressure, and pressure is what makes a child need one more go.',
    enforcedAt: 'both',
  },
  {
    id: 'NOTHING_TO_CHASE',
    rule: 'No scores, streaks, leaderboards, multipliers, daily rewards or self-starting rounds.',
    why: 'Every one of these works by making stopping cost something. Childhood gaming addiction is a real harm and these are its mechanics.',
    enforcedAt: 'both',
  },
  {
    id: 'WORTH_THE_TIME',
    rule: 'It practises something nameable, stated plainly enough to show a parent.',
    why: '"It passes the time" is not a reason for a child to spend an hour on something.',
    enforcedAt: 'idea',
  },
  {
    id: 'HONEST_AGE',
    rule: 'Its age range is a deliberate claim about who it suits, not "everyone" by default.',
    why: 'A range nobody thought about is how a fourteen-year-old ends up with a four-year-old\'s list.',
    enforcedAt: 'idea',
  },
  {
    id: 'ORIGINAL',
    rule: 'Invented here, or a format old enough to belong to everyone — never a commercial game\'s rules-plus-presentation, name, characters or assets.',
    why: 'Nothing here should tie this app\'s fate to someone else\'s rights or brand.',
    enforcedAt: 'idea',
  },
  {
    id: 'PLAYS_WITHOUT_READING',
    rule: 'A child who cannot read can play it, unless reading is the skill it teaches.',
    why: 'Reading is a barrier to play for half this catalogue\'s audience, and the app is navigated by mark and number for exactly that reason.',
    enforcedAt: 'both',
  },
  {
    id: 'REACHABLE_BY_A_CHILD',
    rule: 'Nothing under 72dp, always escapable in one tap, and colour is never the only way to tell things apart.',
    why: 'Small hands are imprecise, a child must always be able to leave, and roughly one boy in twelve cannot separate red from green.',
    enforcedAt: 'both',
  },
];

export type Severity =
  /** The idea cannot be built as described. */
  | 'blocks'
  /** Needs a person to answer before building. Not a refusal. */
  | 'ask';

export type Finding = {
  readonly principle: PrincipleId;
  readonly severity: Severity;
  readonly message: string;
};

/**
 * The phrase lists below are written as strings and assembled into patterns,
 * not typed as regex literals.
 *
 * That is not a style preference. `npm run safety` scans the source for the
 * mechanics this app bans, and it strips comments and string literals first
 * so that naming one in prose does not trip the check — but it cannot strip
 * a regex literal, so `/streak|leaderboard/` in this file read as *building*
 * the thing this file exists to forbid. Strings keep the charter honest
 * against the gate that enforces it, with no exemption carved anywhere.
 */

/**
 * Endings that are not endings: either the round never stops, or it stops
 * only because the player failed. Both mean the finish was not fixed before
 * the round started, which is the property this app relies on.
 */
const UNBOUNDED_PHRASES = [
  'never',
  'forever',
  'survive',
  'as long as',
  'until (?:you|the player) (?:lose|fail|die|miss)',
  'high ?score',
  'beat your',
  'run(?:s|ning)? out of',
  'you (?:lose|fail|die|crash|miss)',
  'game over',
  'last (?:one )?standing',
];

/** Mechanics whose whole job is to make stopping cost something. */
const CHASE_PHRASES = [
  'high ?score',
  'personal best',
  'streak',
  'leaderboard',
  'multiplier',
  'combo',
  'daily (?:reward|bonus|gift)',
  'unlockable',
  'loot',
  'power[- ]?up',
];

/** Pressure mechanics. */
const PRESSURE_PHRASES = [
  'timer',
  'timed',
  'countdown',
  'time limit',
  'lives',
  'game over',
  'sudden death',
  'eliminated',
];

const anyOf = (phrases: readonly string[]): RegExp =>
  new RegExp(`(?:${phrases.join('|')})`, 'i');

const UNBOUNDED = anyOf(UNBOUNDED_PHRASES);
const CHASE = new RegExp(`\\b(?:${CHASE_PHRASES.join('|')})\\b`, 'i');
const PRESSURE = new RegExp(`\\b(?:${PRESSURE_PHRASES.join('|')})\\b`, 'i');

/** A "skill" that is not one. */
const EMPTY_SKILL = /^(?:fun|entertainment|passes? the time|kills? time|relaxation|engagement|addictive)\b/i;

/**
 * Commercial games whose names get borrowed by accident in brainstorms.
 * Not a legal check — a prompt to rename before anyone gets attached.
 */
const TRADEMARKED = [
  'tetris', 'candy crush', 'wordle', 'minecraft', 'roblox', 'fortnite',
  'pokemon', 'pokémon', 'mario', 'sonic', 'angry birds', 'among us',
  'simon says', 'simon', 'monopoly', 'scrabble', 'connect four', 'uno',
  'pac-man', 'pacman', 'space invaders', 'bejeweled', 'subway surfers',
  'temple run', 'clash of clans', 'fruit ninja', 'flappy bird', '2048',
];

/** The youngest age this app has anything for. */
export const YOUNGEST = 3;
/** The open-ended upper bound a "grows with you" game uses. */
export const OPEN_ENDED = 99;

/**
 * Runs the charter against an idea.
 *
 * Returns everything it found, worst first. An empty list means the idea
 * clears every check that can be made before building — not that it is a
 * good game, which is still a human's call.
 */
export function reviewProposal(
  proposal: GameProposal,
  existing: readonly GameProposal[] = GAMES_META,
): readonly Finding[] {
  const found: Finding[] = [];
  const block = (principle: PrincipleId, message: string) =>
    found.push({ principle, severity: 'blocks', message });
  const ask = (principle: PrincipleId, message: string) =>
    found.push({ principle, severity: 'ask', message });

  const prose = `${proposal.title} ${proposal.skill} ${proposal.roundEnds}`;
  // The trademark scan covers the prior-art field too — "a bit like Candy
  // Crush" is exactly where a borrowed name hides, and it is the field most
  // likely to name one honestly.
  const allText = `${prose} ${proposal.priorArt ?? ''} ${proposal.toldApartBy}`;

  // IT_ENDS — the load-bearing one.
  if (proposal.roundEnds.trim() === '') {
    block('IT_ENDS', 'Does not say what finishes a round.');
  } else if (UNBOUNDED.test(proposal.roundEnds)) {
    block(
      'IT_ENDS',
      `"${proposal.roundEnds}" describes a run that only stops when the player does. A round has to end on its own.`,
    );
  }

  // NOTHING_TO_LOSE
  const pressure = prose.match(PRESSURE);
  if (pressure) {
    block('NOTHING_TO_LOSE', `Mentions "${pressure[0]}". Nothing here is timed and nothing can be lost.`);
  }

  // NOTHING_TO_CHASE
  const chase = prose.match(CHASE);
  if (chase) {
    block('NOTHING_TO_CHASE', `Mentions "${chase[0]}". That mechanic works by making stopping cost something.`);
  }

  // WORTH_THE_TIME
  if (proposal.skill.trim() === '') {
    block('WORTH_THE_TIME', 'Does not say what it practises.');
  } else if (EMPTY_SKILL.test(proposal.skill.trim())) {
    block('WORTH_THE_TIME', `"${proposal.skill}" is not a skill. Name what a child gets better at.`);
  } else if (proposal.skill.trim().split(/\s+/).length < 2) {
    ask('WORTH_THE_TIME', `"${proposal.skill}" is very terse for something shown to a parent. Is it specific enough?`);
  }

  // HONEST_AGE
  if (proposal.minAge < YOUNGEST) {
    block('HONEST_AGE', `Starts at ${proposal.minAge}. This app has nothing for under-${YOUNGEST}s and should not pretend to.`);
  }
  if (proposal.maxAge < proposal.minAge) {
    block('HONEST_AGE', `Age range runs backwards (${proposal.minAge}-${proposal.maxAge}).`);
  }
  if (proposal.minAge <= YOUNGEST && proposal.maxAge >= OPEN_ENDED) {
    ask(
      'HONEST_AGE',
      'Spans three to ninety-nine. Very few games genuinely suit a three-year-old and an adult — is this one, or is the range just unset?',
    );
  }

  // ORIGINAL
  const borrowed = TRADEMARKED.find((name) => allText.toLowerCase().includes(name));
  if (borrowed) {
    block('ORIGINAL', `Names "${borrowed}", a commercial game. Rename it for what it teaches.`);
  }
  if (proposal.origin === 'public-domain' && !proposal.priorArt?.trim()) {
    block('ORIGINAL', 'Claims a public-domain format without naming the tradition it draws on.');
  }
  if (proposal.origin === 'original' && proposal.priorArt?.trim()) {
    ask('ORIGINAL', 'Calls itself original but cites prior art. Which is it?');
  }

  // PLAYS_WITHOUT_READING
  if (proposal.readingIsTheSkill && proposal.minAge < 5) {
    block(
      'PLAYS_WITHOUT_READING',
      `Teaches reading from age ${proposal.minAge}. A pre-literate child cannot enter through the skill being taught.`,
    );
  }
  if (!proposal.readingIsTheSkill && /read|spell|word|letter/i.test(proposal.skill)) {
    ask(
      'PLAYS_WITHOUT_READING',
      'Practises something literacy-shaped but is not marked as a reading game. Can a child who cannot read still play it?',
    );
  }

  // REACHABLE_BY_A_CHILD — the part visible from an idea.
  if (proposal.toldApartBy.trim() === '') {
    block('REACHABLE_BY_A_CHILD', 'Does not say how a player tells the pieces apart.');
  } else if (/^(?:colou?r|by colou?r|the colou?rs?)\.?$/i.test(proposal.toldApartBy.trim())) {
    block(
      'REACHABLE_BY_A_CHILD',
      'Tells pieces apart by colour alone. Roughly one boy in twelve cannot. Pair it with a shape, a mark or a number.',
    );
  }

  // Housekeeping that saves a rename later.
  if (existing.some((g) => g.id === proposal.id)) {
    block('ORIGINAL', `The id "${proposal.id}" is already taken by a game in the catalogue.`);
  }
  if (existing.some((g) => g.title.toLowerCase() === proposal.title.toLowerCase())) {
    block('ORIGINAL', `"${proposal.title}" is already the name of a game in the catalogue.`);
  }

  return [...found].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'blocks' ? -1 : 1));
}

/** Whether an idea may proceed to being built. */
export function isAccepted(findings: readonly Finding[]): boolean {
  return !findings.some((f) => f.severity === 'blocks');
}

/** Looks up a principle by id, for printing a report. */
export function principle(id: PrincipleId): Principle {
  const found = PRINCIPLES.find((p) => p.id === id);
  if (!found) throw new Error(`No principle named ${id}`);
  return found;
}
