import type { IconName } from '../components/Icon';
import { palette } from '../theme/tokens';

/**
 * Pure catalogue metadata — deliberately no `Screen` component reference
 * here, and no React import. Keeping this separate from `registry.ts` (which
 * attaches the actual screen components) means this file, and everything
 * that only needs metadata — filtering, search, Parent Zone's game list,
 * tests — never has to load React Native screens just to read a title.
 */

export type GameCategory = 'memory' | 'numbers' | 'words' | 'logic' | 'sorting' | 'timing';

export type GameCategoryDef = {
  readonly id: GameCategory;
  readonly label: string;
  readonly icon: IconName;
};

/** Shown as filter chips on Home, alongside search. A game's `category` is
 *  a discovery aid, not a gate — it never hides a game the way age does. */
export const GAME_CATEGORIES: readonly GameCategoryDef[] = [
  { id: 'memory', label: 'Memory', icon: 'pairs' },
  { id: 'numbers', label: 'Numbers', icon: 'count' },
  { id: 'words', label: 'Words', icon: 'letters' },
  { id: 'logic', label: 'Logic', icon: 'grid' },
  { id: 'sorting', label: 'Sorting', icon: 'shapes' },
  { id: 'timing', label: 'Timing', icon: 'hop' },
];

/**
 * A game, as an idea — everything the charter needs to judge it, and
 * nothing about how it looks.
 *
 * This is the shape a brainstormed game is written in *before* anyone builds
 * it, and `reviewProposal` in `charter.ts` gates it. `GameMeta` below is
 * this plus presentation, which means a shipped game is a passed proposal by
 * construction: the same checker runs over the whole catalogue on every CI
 * run, so the gate cannot rot into a document nobody applies.
 */
export type GameProposal = {
  readonly id: string;
  /** Shown to parents. Children navigate by the icon. */
  readonly title: string;
  /** What this game actually practises. Every game has to practise
   *  something nameable — "it passes the time" is not an entry in this
   *  catalogue, and the charter rejects it. */
  readonly skill: string;
  /**
   * What finishes a round, in plain words.
   *
   * Required, and the point of requiring it is that an unbounded game
   * cannot answer it. Every round here ends on its own — a fixed number of
   * questions, a grid filled, a sequence repeated back — so a child who
   * wants to stop is never mid-something they would lose by stopping.
   */
  readonly roundEnds: string;
  /** Which filter chip this game shows under on Home. Purely a discovery
   *  aid — see `GAME_CATEGORIES`. */
  readonly category: GameCategory;
  /** The actual age range (in years) Home filters by. Inclusive on both
   *  ends. There are no named "age groups" any more — every profile has a
   *  real age, and every game has a real range, compared directly. A game
   *  that's only fun for a narrow band should say so honestly rather than
   *  defaulting to "all ages". */
  readonly minAge: number;
  readonly maxAge: number;
  /** Invented here, or a format old enough to belong to everyone. Never a
   *  specific commercial game's rules-plus-presentation. */
  readonly origin: 'original' | 'public-domain';
  /** For a public-domain format, the tradition it draws on — named, so the
   *  claim can be checked rather than asserted. */
  readonly priorArt?: string;
  /** True only where reading is the skill being taught rather than a barrier
   *  to play. Everything else must be playable by a child who cannot read. */
  readonly readingIsTheSkill?: boolean;
  /**
   * True where a miss ends the round early rather than costing a star.
   * Allowed — the owner decided so for Puddle Hop — but only alongside a
   * finish fixed before the round starts, no score or best kept anywhere,
   * and a fresh round rather than a retry of the same one. The charter asks
   * a person to confirm all three whenever this is set.
   */
  readonly endsOnAMiss?: boolean;
  /** How a player tells the pieces apart. Colour alone is never an answer —
   *  the app is built to work for colour-blind players. */
  readonly toldApartBy: string;
};

/** A proposal that has been built: the idea, plus how it looks. */
export type GameMeta = GameProposal & {
  /** A mark from the app's own icon set — geometry the app draws, never an
   *  image or an emoji. See `src/components/Icon.tsx`. */
  readonly icon: IconName;
  readonly color: string;
  /** Free-text age range shown to parents (e.g. "3-6" or "7+"). Keep this in
   *  sync with `minAge`/`maxAge` — it's the human-readable form of the same
   *  range, not an independent claim. */
  readonly ages: string;
};

/**
 * The catalogue. Adding a game means adding an entry here (and registering
 * its screen in `registry.ts`) — Home, progress tracking, and the parent-
 * facing skill list all read from this one list, so a new game can't ship
 * half-wired.
 */
export const GAMES_META: readonly GameMeta[] = [
  {
    id: 'memory',
    title: 'Find the Pairs',
    icon: 'pairs',
    color: palette.sky,
    skill: 'Visual memory and concentration',
    roundEnds: 'Every pair has been found.',
    origin: 'public-domain',
    priorArt:
      'Concentration, a matching-pairs game played with ordinary cards since at least the 19th century.',
    toldApartBy:
      'The picture on the card.',
    ages: '3-6',
    category: 'memory',
    minAge: 3,
    // A simple picture-matching game is a preschool challenge. It stays
    // capped rather than "all ages" so an adult profile isn't shown
    // something that has nothing left to offer them — see Pattern Play for
    // the sequence-memory game built to actually stay interesting at any age.
    maxAge: 6,
  },
  {
    id: 'counting',
    title: 'How Many?',
    icon: 'count',
    color: palette.sun,
    skill: 'Counting and recognising numerals 1-16',
    roundEnds: 'Five questions answered.',
    origin: 'original',
    toldApartBy:
      'How many objects there are, and which object it is.',
    ages: '3-6',
    category: 'numbers',
    minAge: 3,
    maxAge: 6,
  },
  {
    id: 'shapes',
    title: 'Sort It Out',
    icon: 'shapes',
    color: palette.leaf,
    skill: 'Sorting by shape, colour, and size',
    roundEnds: 'Every item in the round has been sorted.',
    origin: 'original',
    toldApartBy:
      'Shape, colour and size together — a colour round still differs in shape, and a shape round still differs in colour.',
    ages: '3-6',
    category: 'sorting',
    minAge: 3,
    maxAge: 6,
  },
  {
    id: 'wordbuilder',
    title: 'Spell It!',
    icon: 'letters',
    color: palette.grape,
    skill: 'Reading and spelling simple words',
    roundEnds: 'Four words spelled.',
    origin: 'original',
    readingIsTheSkill: true,
    toldApartBy:
      'The picture clue, and the letters themselves.',
    ages: '6-10',
    category: 'words',
    minAge: 6,
    // Spelling short, simple words is an early-reading skill. Capped for the
    // same reason as Find the Pairs: a teenager or adult would find "cat"
    // and "dog" a chore, not a game.
    maxAge: 10,
  },
  {
    id: 'sudoku',
    title: 'Sudoku',
    icon: 'grid',
    color: palette.berry,
    skill: 'Logical reasoning and number placement',
    roundEnds: 'The grid is filled.',
    origin: 'public-domain',
    priorArt:
      'Number-placement puzzles in the Latin-square tradition, in newspapers worldwide since the 1980s and derived from far older mathematics.',
    toldApartBy:
      'The numeral in the cell.',
    ages: '7+',
    category: 'logic',
    minAge: 7,
    // Unlike the games above, Sudoku's real difficulty grows with grid size
    // (up to a full 9x9) and then with how few clues that grid starts with,
    // so it stays genuinely challenging well past childhood — no upper cap
    // needed.
    maxAge: 99,
  },
  {
    id: 'patternplay',
    title: 'Pattern Play',
    icon: 'sequence',
    color: palette.deep,
    skill: 'Sequence memory and concentration',
    roundEnds: 'The sequence has been repeated back.',
    origin: 'public-domain',
    priorArt:
      'Watch-and-repeat sequence memory, a playground game long before it was ever electronic.',
    toldApartBy:
      'A distinct drawn mark per tile — filled against hollow, square against round, up against down.',
    ages: '4+',
    category: 'memory',
    minAge: 4,
    // A growing sequence to repeat back scales its real difficulty with
    // length and tile count, so — unlike a fixed picture-matching game —
    // it keeps being a genuine test of concentration at any age.
    maxAge: 99,
  },
  {
    id: 'numbercrunch',
    title: 'Number Crunch',
    icon: 'math',
    color: palette.teal,
    skill: 'Mental arithmetic: addition, subtraction, multiplication, division',
    roundEnds: 'Six questions answered.',
    origin: 'original',
    toldApartBy:
      'The numerals and the operator.',
    ages: '6+',
    category: 'numbers',
    minAge: 6,
    // Scales from single-digit addition all the way through division, so it
    // has real headroom rather than topping out at what a young child needs.
    maxAge: 99,
  },
  {
    id: 'shapebuilder',
    title: 'Shape Builder',
    icon: 'pieces',
    color: palette.leaf,
    skill: 'Spatial reasoning and rotation',
    roundEnds: 'The outline is completely filled.',
    origin: 'public-domain',
    priorArt:
      'Dissection puzzles — fitting a fixed set of flat pieces into an outline — a tradition several centuries old with no single owner.',
    toldApartBy: 'The shape of each piece, and how many sides it has.',
    ages: '6+',
    category: 'logic',
    minAge: 6,
    // Five pieces that must be pictured turned before they fit an irregular
    // outline is real spatial work for an adult too, and the outline is cut
    // fresh every round, so there is no ceiling of memorised layouts.
    maxAge: 99,
  },
  {
    id: 'puddlehop',
    title: 'Puddle Hop',
    icon: 'hop',
    color: palette.sky,
    skill: 'Timing and anticipation: judging when something arrives, and acting at that moment',
    roundEnds: 'The runner reaches the finish flag, or bumps into something on the way.',
    endsOnAMiss: true,
    origin: 'public-domain',
    priorArt:
      'Jump-the-obstacle running games — a playground race long before a screen, and a side-scrolling staple since the earliest home computers.',
    toldApartBy: 'The shape of each obstacle: squat, tall, long and flat, or a pair.',
    ages: '4+',
    category: 'timing',
    minAge: 4,
    // One button, so a four-year-old can play it; speed, tighter gaps and
    // obstacles that need a held hop make the top level a real test of
    // timing for anyone. Every run is short, and ends at the flag or at the
    // first bump, whichever comes first.
    maxAge: 99,
  },
  {
    id: 'lanedash',
    title: 'Lane Dash',
    icon: 'race',
    color: palette.berry,
    skill: "Steering and looking ahead: choosing a lane early enough to get round what's coming",
    roundEnds: 'Your car crosses the chequered flag at the end of a fixed track.',
    origin: 'public-domain',
    priorArt:
      'Top-down lane racing — toy car tracks and arcade road games long before this one, owned by no one.',
    toldApartBy:
      'Shape: your car has googly eyes, rivals carry a number, cones are triangles, puddles are flat pools and roadworks are long striped blocks.',
    ages: '5+',
    category: 'timing',
    minAge: 5,
    // Two taps, left and right, so a five-year-old can race; three lanes,
    // a fast road and rivals close behind a clean race make the top level a
    // real test of looking ahead for anyone. Every race ends at the flag.
    maxAge: 99,
  },
  {
    id: 'oddoneout',
    title: 'Odd One Out',
    icon: 'odd',
    color: palette.grape,
    skill: 'Visual discrimination: spotting the one thing that differs, among more and more things that differ less and less',
    roundEnds: 'Six groups looked through.',
    origin: 'public-domain',
    priorArt:
      'Odd-one-out puzzles — a staple of picture books, classroom worksheets and reasoning tests for over a century, owned by no one.',
    toldApartBy:
      'Shape, size and which way up — never colour alone. Colour only ever adds to a difference the shape already shows.',
    ages: '3+',
    category: 'sorting',
    minAge: 3,
    // A deliberate 3-99, confirmed by the owner when the charter asked:
    // three shapes and a glaring difference at level 1, sixteen shapes in a
    // jumble of colours with one slightly smaller at level 6. The top is a
    // real visual search for an adult, not a toddler game they tolerate.
    maxAge: 99,
  },
];

export function findGameMeta(id: string): GameMeta | undefined {
  return GAMES_META.find((g) => g.id === id);
}

/** Games a profile of this age should see — the actual catalogue filter.
 *  Compares a real age against a real range; there is no "age group" layer
 *  in between. */
export function gamesForAge(age: number): readonly GameMeta[] {
  return GAMES_META.filter((g) => g.minAge <= age && age <= g.maxAge);
}

/** Case-insensitive substring match against title and skill, so "spell" and
 *  "reading" both find Spell It!. An empty or whitespace-only query matches
 *  everything, so a cleared search box always restores the full list. */
export function searchGames(games: readonly GameMeta[], query: string): readonly GameMeta[] {
  const q = query.trim().toLowerCase();
  if (!q) return games;
  return games.filter(
    (g) => g.title.toLowerCase().includes(q) || g.skill.toLowerCase().includes(q),
  );
}

/** `null` means "every category" — the default, unfiltered state of the
 *  category chips on Home. */
export function gamesByCategory(
  games: readonly GameMeta[],
  category: GameCategory | null,
): readonly GameMeta[] {
  if (!category) return games;
  return games.filter((g) => g.category === category);
}
