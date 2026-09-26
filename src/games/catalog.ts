import type { IconName } from '../components/Icon';
import { tilePalette } from '../theme/tokens';

/**
 * Pure catalogue metadata — deliberately no `Screen` component reference
 * here, and no React import. Keeping this separate from `registry.ts` (which
 * attaches the actual screen components) means this file, and everything
 * that only needs metadata — filtering, search, Parent Zone's game list,
 * tests — never has to load React Native screens just to read a title.
 */

export type GameCategory = 'memory' | 'numbers' | 'words' | 'logic' | 'sorting' | 'timing' | 'arcade' | 'together';

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
  { id: 'arcade', label: 'Arcade', icon: 'arcade' },
  { id: 'together', label: 'Together', icon: 'group' },
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
    color: tilePalette.indigo,
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
    color: tilePalette.ochre,
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
    color: tilePalette.green,
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
    color: tilePalette.rose,
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
    color: tilePalette.teal,
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
    color: tilePalette.violet,
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
    color: tilePalette.orange,
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
    color: tilePalette.olive,
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
    color: tilePalette.blue,
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
    color: tilePalette.slate,
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
    // Tap the lane you want, so a five-year-old can race; three lanes,
    // a fast road and rivals close behind a clean race make the top level a
    // real test of looking ahead for anyone. Every race ends at the flag.
    maxAge: 99,
  },
  {
    id: 'oddoneout',
    title: 'Odd One Out',
    icon: 'odd',
    color: tilePalette.magenta,
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
  {
    id: 'memorygrid',
    title: 'Memory Grid',
    icon: 'memorygrid',
    color: tilePalette.pine,
    skill: "Spatial memory: holding where several things were, all at once, after they've gone",
    roundEnds: 'Five patterns remembered.',
    origin: 'public-domain',
    priorArt:
      'Block-tapping memory tasks, used in child-development research since the 1970s, and lights-on-a-grid memory games long before screens.',
    toldApartBy:
      'Position on the grid. A lit square is filled and says so to a screen reader; a found one keeps a mark.',
    ages: '4+',
    category: 'memory',
    minAge: 4,
    // Two squares on a small grid is about a four-year-old's span; seven on a
    // four-by-four is a stretch for an adult. Every round is five patterns.
    maxAge: 99,
  },
  {
    id: 'shadowmatch',
    title: 'Shadow Match',
    icon: 'shadow',
    color: tilePalette.stone,
    skill: 'Shape recognition: knowing a thing by its outline alone, then by its outline turned',
    roundEnds: 'Six shadows matched.',
    origin: 'public-domain',
    priorArt:
      'Match-the-shadow puzzles — a picture-book and preschool-worksheet staple for generations, owned by no one.',
    toldApartBy:
      'The outline of each shadow. Every shadow is the same dark colour, so shape is the only thing to go on.',
    ages: '3-7',
    category: 'sorting',
    minAge: 3,
    // Two very different shadows is a three-year-old's game; six near
    // misses, each turned its own way, stretches a seven-year-old. Past
    // that it is a picture-book game, so it stops there.
    maxAge: 7,
  },
  {
    id: 'whichcup',
    title: 'Which Cup?',
    icon: 'cups',
    color: tilePalette.grape,
    skill: 'Keeping track: following one thing with your eyes while it moves among others that look the same',
    roundEnds: 'Five balls found.',
    origin: 'public-domain',
    priorArt:
      'Cups and balls, a conjuring trick performed for over two thousand years, and the hide-it-under-a-cup game every family plays at a kitchen table.',
    toldApartBy:
      'Where each cup is. The cups are alike on purpose; the ball is a round shape seen when a cup lifts.',
    ages: '3-10',
    category: 'memory',
    minAge: 3,
    // Two cups swapped once is where a three-year-old's tracking is; four
    // cups swapped seven times, crossing over, holds a ten-year-old. It
    // never speeds up past what a child can follow, so it stops there.
    maxAge: 10,
  },
  {
    id: 'bigtosmall',
    title: 'Big to Small',
    icon: 'bigsmall',
    color: tilePalette.moss,
    skill: 'Ordering by size: seeing which is bigger, and putting a whole set in order',
    roundEnds: 'Four sets put in order.',
    origin: 'public-domain',
    priorArt:
      'Seriation — nesting cups, stacking rings and size-ordering tasks used in early-years teaching since Froebel and Montessori.',
    toldApartBy: 'Size. Colour and shape never give the order away.',
    ages: '3-7',
    category: 'sorting',
    minAge: 3,
    // Ordering by size is an early-years idea. Seven shapes a tenth apart,
    // each turned, is a real look for a seven-year-old, and there it stops.
    maxAge: 7,
  },
  {
    id: 'tileslide',
    title: 'Tile Slide',
    icon: 'slide',
    color: tilePalette.cyan,
    skill: 'Planning ahead: working out a sequence of moves that puts a mixed-up grid back in order',
    roundEnds: 'Every tile is back in its place.',
    origin: 'public-domain',
    priorArt:
      'The sliding fifteen puzzle, a craze of the 1880s, and sliding-block puzzles in general, owned by no one.',
    toldApartBy: 'The numeral on each tile.',
    ages: '7+',
    category: 'logic',
    minAge: 7,
    // A four-by-four mixed by sixty moves asks an adult to plan, and every
    // tile is full size — it is what Nonogram could not be on a phone.
    maxAge: 99,
  },
  {
    id: 'wordladder',
    title: 'Word Ladder',
    icon: 'ladder',
    color: tilePalette.brown,
    skill: 'Reading and vocabulary: turning one word into another a letter at a time, through real words',
    roundEnds: 'Three ladders climbed.',
    origin: 'public-domain',
    readingIsTheSkill: true,
    priorArt:
      'Doublets, the one-letter-at-a-time word puzzle Lewis Carroll published in 1879, known ever since as the word ladder.',
    toldApartBy: 'The letters of each word.',
    ages: '10+',
    category: 'words',
    minAge: 10,
    // Six-step ladders whose wrong turns look as close to the goal as the
    // right one are Carroll's puzzle for grown-ups too.
    maxAge: 99,
  },
  {
    id: 'fruitcatch',
    title: 'Fruit Catch',
    icon: 'catch',
    color: tilePalette.fern,
    skill: 'Hand-eye coordination: tracking falling things and getting there in time',
    roundEnds: 'Twenty things have fallen.',
    origin: 'public-domain',
    priorArt: 'Catch-the-falling-object games — a fairground and early home-computer staple, owned by no one.',
    toldApartBy: 'Shape: round fruit to catch, spiky pine cones to let fall.',
    ages: '3-10',
    category: 'timing',
    minAge: 3,
    // Two columns of slow fruit is a three-year-old's; four columns, quick,
    // with a third of what falls to be avoided, holds a ten-year-old. Past
    // that it is a toddler's catching game, so it stops there.
    maxAge: 10,
  },
  {
    id: 'maze',
    title: 'Maze Explorer',
    icon: 'maze',
    color: tilePalette.periwinkle,
    skill: 'Spatial planning: finding a route and seeing dead ends before walking into them',
    roundEnds: 'Two mazes walked to the flag.',
    origin: 'public-domain',
    priorArt: 'Mazes and labyrinths, drawn and walked for thousands of years.',
    toldApartBy: 'Walls are solid lines; the explorer has googly eyes; the goal is a flag shape.',
    ages: '3-12',
    category: 'logic',
    minAge: 3,
    // Three by three with one turn, up to thirteen rows of ten with a key to
    // fetch before the door opens. A whole maze fits on one screen, so it
    // stops at twelve rather than pretending to be an adult puzzle.
    maxAge: 12,
  },
  {
    id: 'ballooncount',
    title: 'Balloon Count',
    icon: 'balloons',
    color: tilePalette.mauve,
    skill: 'Number order: counting on, then counting back and in twos and fives',
    roundEnds: 'Four bunches of balloons popped in order.',
    origin: 'original',
    toldApartBy: 'The dots or numeral on each balloon.',
    ages: '3-8',
    category: 'numbers',
    minAge: 3,
    // One-two-three in dots, up to counting back and in fives and tens with
    // balloons that don't belong — the counting of the first school years.
    maxAge: 8,
  },
  {
    id: 'treasurehunt',
    title: 'Treasure Hunt',
    icon: 'treasure',
    color: tilePalette.khaki,
    skill: 'Deduction: using clues from each dig to work out where the treasure must be',
    roundEnds: 'Three treasures found.',
    origin: 'public-domain',
    priorArt: 'Hot-and-cold hide-and-seek, and grid guessing games played on paper for over a century.',
    toldApartBy: 'Arrows and step counts on each dug square.',
    ages: '5-12',
    category: 'logic',
    minAge: 5,
    // Arrows on a small map, up to working out a square from two or three
    // distances. Four squares across is all a phone fits at full size, so
    // the map stays small and the game stops at twelve.
    maxAge: 12,
  },
  {
    id: 'waterworks',
    title: 'Water Works',
    icon: 'pipes',
    color: tilePalette.sage,
    skill: 'Spatial reasoning: turning pieces so they join into one connected path',
    roundEnds: 'Three flowers watered.',
    origin: 'public-domain',
    priorArt:
      'Connect-the-path tile puzzles — rotating pieces into a network — a paper and wooden-toy puzzle tradition with no single owner.',
    toldApartBy: 'The shape of each pipe piece: straight, bend, T or cross.',
    ages: '5-12',
    category: 'logic',
    minAge: 5,
    // Three straight pipes, up to a four-by-six grid of bends, Ts and
    // crossings with no shortcut. The grid is kept to what fits a phone at
    // full size, so it stops at twelve.
    maxAge: 12,
  },
  {
    id: 'bouncebricks',
    title: 'Bounce Bricks',
    icon: 'bricks',
    color: tilePalette.clay,
    skill: 'Tracking and reacting: following a moving ball, getting the paddle under it, and aiming where it goes next',
    roundEnds: 'The wall is cleared, or the fifth ball has been played.',
    origin: 'public-domain',
    priorArt:
      'Bat-and-ball wall-breaking games, a genre on arcade machines and home computers since the 1970s and owned by no one.',
    toldApartBy:
      'Shape and position: the paddle is a long bar at the bottom, the ball is round, bricks are blocks; a brick that takes two hits is striped.',
    ages: '5+',
    category: 'arcade',
    minAge: 5,
    // A slow ball over a wide paddle is a five-year-old's; a quick one over
    // a short paddle, aimed at the last two-hit bricks, is anyone's.
    maxAge: 99,
  },
  {
    id: 'hungryworm',
    title: 'Hungry Worm',
    icon: 'worm',
    color: tilePalette.jade,
    skill: 'Steering and planning ahead: choosing turns early so a longer and longer worm reaches the apple without boxing itself in',
    roundEnds: 'Ten apples eaten.',
    origin: 'public-domain',
    priorArt:
      'Steer-a-growing-line games, played on arcade machines, calculators and phones since the 1970s, owned by no one.',
    toldApartBy: 'Shape: the worm has eyes and a striped body, apples are round with a leaf, rocks are grey squares.',
    ages: '5+',
    category: 'arcade',
    minAge: 5,
    // Planning around your own tail, quick, among rocks, is a real puzzle at
    // any age — and a bump never ends it, so it never punishes.
    maxAge: 99,
  },
  {
    id: 'peekaboo',
    title: 'Peekaboo Pals',
    icon: 'peekaboo',
    color: tilePalette.fuchsia,
    skill: 'Paying attention and holding back: tapping the pals who are awake and leaving the sleepy ones alone',
    roundEnds: 'Twenty pals have peeked out.',
    origin: 'public-domain',
    priorArt:
      'Pop-up target games — fairground and arcade machines where things appear from holes to be tapped — a tradition owned by no one.',
    toldApartBy: 'Eyes: awake pals have big open eyes, sleepy pals have shut eyes and a nightcap.',
    ages: '3-10',
    category: 'arcade',
    minAge: 3,
    // Four holes and one pal at a time is a three-year-old's; twelve holes,
    // three up at once and a third of them sleepy holds a ten-year-old.
    // Past that it is a little one's game, so it stops there.
    maxAge: 10,
  },
  {
    id: 'hoopshot',
    title: 'Hoop Shot',
    icon: 'hoop',
    color: tilePalette.copper,
    skill: 'Judging angle and strength: picking the curve that drops a ball through a hoop, then allowing for wind',
    roundEnds: 'Ten throws.',
    origin: 'public-domain',
    priorArt:
      'Ball-toss games, from fairground hoop stalls to arcade basketball machines, owned by no one.',
    toldApartBy: 'Shape: the ball is round, the hoop is a rim and net on a board, the wind is shown by a flag.',
    ages: '5+',
    category: 'arcade',
    minAge: 5,
    // A wide hoop with the whole throw drawn in dots is a five-year-old's; a
    // narrow, swaying hoop in the wind with barely a hint is anyone's.
    maxAge: 99,
  },
  {
    id: 'softlanding',
    title: 'Soft Landing',
    icon: 'lander',
    color: tilePalette.heather,
    skill: 'Controlling speed: using just enough push, early enough, to bring a falling rocket down gently on its pad',
    roundEnds: 'Three landings.',
    origin: 'public-domain',
    priorArt:
      'Lander games, played since a text game of 1969 and on arcade machines and computers ever since, owned by no one.',
    toldApartBy: 'Shape: the rocket has legs and a window, the pad is a flat striped block, the ground is flat or hilly.',
    ages: '7+',
    category: 'arcade',
    minAge: 7,
    // Holding a button to slow down is a seven-year-old's; strong gravity,
    // a small pad across the hills, wind and little fuel is anyone's.
    maxAge: 99,
  },
  {
    id: 'talltower',
    title: 'Tall Tower',
    icon: 'tower',
    color: tilePalette.azure,
    skill: 'Timing: stopping a sliding block at just the right moment so it lands square on the one below',
    roundEnds: 'Twelve blocks dropped.',
    origin: 'public-domain',
    priorArt: 'Block-stacking timing games, from wooden stacking toys to arcade machines, owned by no one.',
    toldApartBy: 'Position and shape: the sliding block is above the tower; a trimmed-off piece is shown falling away.',
    ages: '4+',
    category: 'arcade',
    // Tap-timing starts at four here, as Puddle Hop does.
    minAge: 4,
    // A wide, slow block with an outline to aim at is a four-year-old's; a
    // narrow one that speeds up as the tower climbs is a real test at any age.
    maxAge: 99,
  },
  {
    id: 'duckcrossing',
    title: 'Duck Crossing',
    icon: 'duck',
    color: tilePalette.grass,
    skill: 'Looking ahead and judging gaps: choosing when it is safe to step across a moving lane',
    roundEnds: 'Three ducklings home at the pond.',
    origin: 'public-domain',
    priorArt:
      'Cross-the-road games, a playground road-safety lesson and an arcade staple since the 1980s, owned by no one.',
    toldApartBy: 'Shape: the duckling is round with a beak, cars and vans are long blocks with wheels.',
    ages: '4+',
    category: 'arcade',
    minAge: 4,
    // Two quiet lanes is a four-year-old's; seven busy ones with lorries and
    // small gaps asks for real judgement at any age.
    maxAge: 99,
  },
  {
    id: 'codecracker',
    title: 'Code Cracker',
    icon: 'code',
    color: tilePalette.plum,
    skill: 'Deduction: using what each guess reveals to narrow down a hidden row of shapes',
    roundEnds: 'The code is cracked, or ten guesses have been made and it is shown.',
    origin: 'public-domain',
    priorArt: 'Bulls and Cows, a pencil-and-paper code-breaking game over a century old, owned by no one.',
    toldApartBy:
      'Shape: each symbol is a different shape; a filled peg means right shape in the right place, a hollow peg right shape in the wrong place.',
    ages: '6+',
    category: 'logic',
    minAge: 6,
    // Three shapes with a mark under each is a six-year-old's; five, with
    // repeats and only a count to go on, is a proper puzzle for an adult.
    maxAge: 99,
  },
  {
    id: 'clocktime',
    title: "What's the Time?",
    icon: 'clockface',
    color: tilePalette.raspberry,
    skill: "Telling the time: working out the time from an analogue clock's hands, to the hour, the half, the quarter and the minute",
    roundEnds: 'Ten clocks.',
    origin: 'public-domain',
    priorArt: 'Learning-clock exercises, used in primary classrooms for well over a century and owned by no one.',
    toldApartBy:
      'The hands: the short hand points to the hour and the long hand to the minutes; each answer is a time written in numbers.',
    ages: '5-10',
    category: 'numbers',
    minAge: 5,
    // O'clock at five, any minute by eight or nine; past ten it's a skill
    // already had, so it stops there.
    maxAge: 10,
  },
  {
    id: 'rhymetime',
    title: 'Rhyme Time',
    icon: 'rhyme',
    color: tilePalette.mustard,
    skill: 'Hearing rhymes in written words: picking the word that rhymes, even when it is spelt differently',
    roundEnds: 'Ten rhymes found.',
    origin: 'public-domain',
    priorArt: 'Rhyming-word exercises, as old as nursery rhymes and every early-reading classroom, owned by no one.',
    toldApartBy: 'Reading is the skill: every choice is a written word.',
    ages: '5-9',
    category: 'words',
    readingIsTheSkill: true,
    minAge: 5,
    // Early reading: cat and hat at five, food and good by eight or nine.
    maxAge: 9,
  },
  {
    id: 'marketmemory',
    title: 'Market Memory',
    icon: 'market',
    color: tilePalette.caramel,
    skill: "Sequence memory, together: remembering a growing list in order, the way the old 'I went to market' game does",
    roundEnds: "The bag holds the level's number of things.",
    origin: 'public-domain',
    priorArt: "'I went to market and bought...', a spoken memory-chain game played by families for generations, owned by no one.",
    toldApartBy: 'Shape and box: no two things share both a shape and a box, and each is named by its colour too.',
    ages: '4+',
    category: 'together',
    // A group game: four things in the bag suits a four-year-old in the
    // family; twelve, shuffled, with twins, stretches the grown-ups too.
    minAge: 4,
    maxAge: 99,
  },
  {
    id: 'countaround',
    title: 'Count Around',
    icon: 'countaround',
    color: tilePalette.lagoon,
    skill: 'Counting in turn: counting on, and spotting the multiples where you clap or stomp instead of saying the number',
    roundEnds: 'The team reaches the target number.',
    origin: 'public-domain',
    priorArt: 'Counting-round games such as Fizz, played in classrooms and around tables for generations, owned by no one.',
    toldApartBy: 'Numerals and two drawn actions: every choice is a number in digits, a pair of clapping hands, or a stomping boot.',
    ages: '5+',
    category: 'together',
    // Counting to ten at five; claps on threes and stomps on fives up to
    // forty-five keeps a table of grown-ups honest.
    minAge: 5,
    maxAge: 99,
  },
  {
    id: 'starjar',
    title: 'Star Jar',
    icon: 'starjar',
    color: tilePalette.orchid,
    skill: 'Counting and arithmetic, each player at their own level, filling one shared jar',
    roundEnds: 'Every player has answered three questions.',
    origin: 'public-domain',
    priorArt: 'Family quiz rounds with questions pitched to each player, a parlour game older than any company, owned by no one.',
    toldApartBy: 'Numerals and dots to count: answers are numbers in digits.',
    ages: '4+',
    category: 'together',
    // Every player picks their own kind of question, so it spans the whole
    // family by design.
    minAge: 4,
    maxAge: 99,
  },
  {
    id: 'mazeteam',
    title: 'Maze Team',
    icon: 'mazeteam',
    color: tilePalette.lime,
    skill: 'Working together: talking and planning a route when each player controls only some of the directions',
    roundEnds: 'Two mazes finished.',
    origin: 'public-domain',
    priorArt: 'Mazes, older than writing, and the co-operative trick of sharing out the controls, a party-game staple owned by no one.',
    toldApartBy: "Direction and player mark: each arrow shows which way it goes and which player's shape it belongs to.",
    ages: '4+',
    category: 'together',
    // A small maze shared by two at four; thirteen rows with a key, four
    // players an arrow each, is a real piece of teamwork at any age.
    minAge: 4,
    maxAge: 99,
  },
  {
    id: 'echobeat',
    title: 'Echo Beat',
    icon: 'echo',
    color: tilePalette.lichen,
    skill: 'Rhythm: copying a beat someone else tapped, then making a new one for the next player',
    roundEnds: 'Eight rhythms echoed.',
    origin: 'public-domain',
    priorArt: 'Call-and-response clapping games, as old as music and played in every playground, owned by no one.',
    toldApartBy: "Light and position: the drum lights up on each beat, and a row of marks shows the beat's pattern.",
    ages: '4+',
    category: 'together',
    // Three slow beats copied loosely at four; six, copied closely with no
    // marks to help, is a musician's ear at any age.
    minAge: 4,
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
