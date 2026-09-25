/**
 * How to play each game — behind the "?" at the top right of every game.
 *
 * Written to be read aloud by a grown-up as much as read by a child: short
 * sentences, the words the game itself uses, and an example wherever the
 * rule is easier seen than said. Every game in the catalogue has an entry;
 * `tests/help.test.ts` fails if one is missing.
 */

export type GameHelp = {
  /** What finishing looks like, in one sentence. */
  readonly goal: string;
  /** How to play, a step at a time. */
  readonly steps: readonly string[];
  /** A small worked example, where the rule is easier shown than said. */
  readonly example?: string;
  /** How it changes as the player gets better. */
  readonly grows: string;
};

export const HELP: Readonly<Record<string, GameHelp>> = {
  memory: {
    goal: 'Find every pair of matching cards.',
    steps: [
      'Tap a card to turn it over.',
      'Tap another card. If the two pictures match, they stay face up.',
      "If they don't match, they turn back over. Try to remember where they were!",
    ],
    example: 'You turn over a star, then a moon: no match. Later you find another star, and you remember where the first one was.',
    grows: 'More pairs to find, from 3 up to 8.',
  },
  counting: {
    goal: 'Answer five counting questions.',
    steps: ['Count the things on the screen.', 'Tap the number that says how many there are.'],
    example: 'Three apples: tap 3.',
    grows: 'Bigger numbers to count, up to 16, and more numbers to choose from.',
  },
  shapes: {
    goal: 'Sort every item into the right basket.',
    steps: [
      'Look at the baskets: each one is for a different shape, colour or size.',
      'Tap the basket the item belongs in.',
    ],
    example: 'The baskets are a circle and a star, and the item is a blue star: tap the star basket.',
    grows: 'More baskets, and sorting by shape, colour or size.',
  },
  wordbuilder: {
    goal: 'Spell four words.',
    steps: ['Look at the picture.', 'Tap the letters in order to spell what it is.'],
    example: 'A picture of a cat: tap C, then A, then T.',
    grows: 'Longer words, and later some spare letters that aren’t in the word.',
  },
  sudoku: {
    goal: 'Fill every empty square of the grid.',
    steps: [
      'Every row, every column and every box must have each number exactly once.',
      'Tap an empty square, then tap the number that goes there.',
    ],
    example: 'A row has 1, 2 and 4 in it: the empty square in that row must be 3.',
    grows: 'From a small 4-by-4 grid up to a full 9-by-9, with fewer numbers given.',
  },
  patternplay: {
    goal: 'Repeat the pattern back.',
    steps: [
      'Watch the tiles light up, one after another.',
      'Then tap the same tiles in the same order.',
      'Forgotten it? The replay button shows it again.',
    ],
    example: 'Circle, square, circle lights up: tap circle, square, circle.',
    grows: 'Longer patterns, on more tiles.',
  },
  numbercrunch: {
    goal: 'Answer six sums.',
    steps: ['Work out the sum.', 'Tap the answer.'],
    example: '7 + 5: tap 12.',
    grows: 'Bigger numbers, then take-aways, times and shares.',
  },
  shapebuilder: {
    goal: 'Fill the outline completely with the pieces.',
    steps: [
      'Tap a piece to pick it up.',
      'Tap "turn" if it needs turning round.',
      'Tap the square in the outline where the piece should go.',
      'Changed your mind? Tap a placed piece to pick it back up.',
    ],
    grows: 'More pieces, bigger outlines, and pieces that have to be turned.',
  },
  puddlehop: {
    goal: 'Run all the way to the flag.',
    steps: [
      'Tap to start running.',
      'Press to hop over what’s in the way. Hold longer for a bigger hop.',
      'A bump ends the run, and the next run is a new course.',
    ],
    grows: 'Faster, with more in the way and less room between.',
  },
  lanedash: {
    goal: 'Race to the chequered flag ahead of the other cars.',
    steps: [
      'Tap a lane to start.',
      'Tap the lane you want to drive in. Two lanes across, the car hops over the middle one.',
      'Steer round cones, puddles and roadworks. A bump slows you down for a moment.',
    ],
    grows: 'Three lanes, a faster road, more in the way, and rivals closer behind.',
  },
  oddoneout: {
    goal: 'Find the odd one out in six groups.',
    steps: ['Look at all the shapes.', 'Tap the one that’s different from the rest.'],
    example: 'Three squares and a diamond: tap the diamond.',
    grows: 'More shapes, and smaller differences: a little smaller, or upside down.',
  },
  memorygrid: {
    goal: 'Remember five patterns of squares.',
    steps: [
      'Some squares light up for a moment.',
      'When they go dark, tap the ones that were lit.',
      'Forgotten? The replay button shows them again.',
    ],
    grows: 'More squares to remember, on a bigger grid.',
  },
  shadowmatch: {
    goal: 'Match six things to their shadows.',
    steps: ['Look at the thing at the top.', 'Tap the dark shadow that has the same shape.'],
    example: 'A house with a chimney: tap the shadow with the chimney, not the one without.',
    grows: 'More shadows, shadows that look nearly the same, and shadows turned on their side.',
  },
  whichcup: {
    goal: 'Find the ball five times.',
    steps: [
      'Watch the ball go under a cup.',
      'The cups slide around. Keep your eyes on the ball’s cup!',
      'When they stop, tap the cup the ball is under.',
    ],
    grows: 'More cups, more swaps, and cups crossing over.',
  },
  bigtosmall: {
    goal: 'Put four sets of shapes in order.',
    steps: ['Tap the biggest shape first.', 'Then the next biggest, down to the smallest.'],
    example: 'A big star, a middle star and a small star: tap big, then middle, then small.',
    grows: 'More shapes, closer in size, then turned and in different colours.',
  },
  tileslide: {
    goal: 'Put the numbered tiles back in order.',
    steps: [
      'Tap a tile next to the gap, or in line with it, to slide it along.',
      'Put 1 in the top left and the rest in order, with the gap at the bottom right.',
    ],
    example: 'On a small grid, 1 2 on top and _ 3 below: tap 3 so it slides into the gap. Done!',
    grows: 'From a 2-by-2 grid to 4-by-4, more and more mixed up.',
  },
  wordladder: {
    goal: 'Climb three word ladders.',
    steps: [
      'Change the top word into the bottom word, one letter at a time.',
      'Every step has to be a real word.',
      'Tap the word that gets you a step closer.',
    ],
    example: 'COLD to WARM: COLD, CORD, CARD, WARD, WARM.',
    grows: 'Longer words and ladders, and wrong words that look just as close.',
  },
  fruitcatch: {
    goal: 'Catch the fruit as it falls. There are twenty things in a round.',
    steps: [
      'Tap to start.',
      'Tap a column and the basket moves under it.',
      'Catch round fruit. Let the spiky pine cones fall past.',
    ],
    grows: 'More columns, faster fruit, and more pine cones to dodge.',
  },
  maze: {
    goal: 'Walk the explorer to the flag, in two mazes.',
    steps: [
      'Tap an arrow to walk that way. The explorer walks until there’s a choice to make.',
      'Find the way to the flag.',
      'In bigger mazes, pick up the key first: it opens the door on the way to the flag.',
    ],
    grows: 'Bigger mazes, then a key and a door.',
  },
  ballooncount: {
    goal: 'Pop four bunches of balloons in counting order.',
    steps: [
      'Pop the balloons in counting order.',
      'The string at the top shows how the count starts, and has a place for each balloon to pop.',
      'Some balloons don’t belong in the count. Leave them!',
    ],
    example: 'The string shows 10, 8: counting down in twos. Pop 6, then 4, then 2.',
    grows: 'From dots to numbers, then counting on, counting back, and in twos, fives and tens.',
  },
  treasurehunt: {
    goal: 'Find three buried treasures.',
    steps: [
      'Tap a square to dig it.',
      'If the treasure isn’t there, the hole shows a clue.',
      'Use the clues to work out where the treasure must be.',
    ],
    example:
      'A hole says "2 steps": the treasure is two squares away, counting up, down and across. Another hole says "1 step": look where both could be true.',
    grows: 'First arrows that point to the treasure, then only how many steps away.',
  },
  waterworks: {
    goal: 'Get water from the tap to the flower, three times.',
    steps: [
      'Tap a pipe to turn it round.',
      'Join the pipes into a path from the tap on the left to the flower on the right.',
      'The water shows how far your pipes join up.',
    ],
    grows: 'A bigger grid, with bends, T-pieces and crossings.',
  },
};

export function helpFor(gameId: string): GameHelp | undefined {
  return HELP[gameId];
}
