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
  bouncebricks: {
    goal: 'Knock down the wall of bricks in five serves.',
    steps: [
      'Tap to serve the ball. Slide your finger to move the paddle.',
      'A ball that gets past the paddle just means the next serve, up to five.',
      'Get the paddle under the ball to bounce it back up. Every brick it hits breaks.',
      'Where the ball lands on the paddle sets where it goes: the middle sends it straight up, the ends send it off to the side.',
    ],
    example: 'One brick left, over on the right? Catch the ball on the right end of the paddle.',
    grows: 'A smaller paddle, a faster ball, a bigger wall, then striped bricks that take two hits.',
  },
  hungryworm: {
    goal: 'Steer the worm to ten apples.',
    steps: [
      'Press an arrow to start the worm, and to turn it.',
      'The worm keeps going the way it faces. Every apple makes it longer.',
      'Bump into a wall, a rock or its own tail and it stops and waits. Pick another way.',
    ],
    example: 'The worm is going right and the apple is above it: press the up arrow before it goes past.',
    grows: 'A faster worm that grows more with each apple, then rocks in the way.',
  },
  peekaboo: {
    goal: 'Say hello to the pals who peek out of their holes. Twenty pals peek out in a round.',
    steps: [
      'Tap a hole to start.',
      'When a pal with open eyes pops up, tap it to say hello.',
      'Pals with shut eyes and a nightcap are sleepy. Leave them to sleep.',
    ],
    grows: 'More holes, pals who duck back down sooner, more of them up at once, and more sleepy ones.',
  },
  hoopshot: {
    goal: 'Throw the ball through the hoop. You have ten throws.',
    steps: [
      'Put your finger on the court and pull back, away from the hoop.',
      'The dots show where the ball will go. Pull further to throw harder, lower or higher to change the curve.',
      'Let go to throw. It goes in if it drops down through the hoop.',
    ],
    example: 'The dots fall short of the hoop? Pull back a little further before you let go.',
    grows: 'A smaller hoop, fewer dots to guide you, a hoop that moves between throws, then wind, then a hoop that sways.',
  },
  softlanding: {
    goal: 'Land the rocket gently on the striped pad, three times.',
    steps: [
      'Press the up button to start the rocket falling.',
      'Hold the up button to fire the engine and slow down. Let go and it falls faster.',
      'Touch down slowly: the speed bar should not reach its line. From level 3, the side buttons push the rocket left and right, over the pad.',
    ],
    example: 'The speed bar goes past the line near the ground? Hold the up button until it is back above.',
    grows: 'Stronger gravity, a smaller pad further away, hills, wind, and less fuel.',
  },
  talltower: {
    goal: 'Build a tower twelve blocks high.',
    steps: [
      'Tap to start the block sliding.',
      'Tap again to drop it onto the tower.',
      'Any part hanging over the edge is cut off, so the tower gets narrower. Land it square to keep it wide.',
    ],
    example: 'The block is halfway over the edge? Tap a moment earlier next time, before it gets there.',
    grows: 'A narrower tower, a faster block, no outline to aim at, then a block that speeds up as the tower rises.',
  },
  duckcrossing: {
    goal: 'Help three ducklings across the roads to their pond.',
    steps: [
      'Press the arrows to hop the duckling one square at a time.',
      'Watch which way each lane goes. Hop when there is a gap.',
      'Bumped by a car? The duckling goes back to the grass and tries again.',
    ],
    example: 'A van is coming along the next lane? Wait on the grass until it has gone by, then hop.',
    grows: 'More lanes, faster traffic, smaller gaps, and longer lorries.',
  },
  codecracker: {
    goal: 'Work out the hidden row of shapes in ten guesses or fewer.',
    steps: [
      'Tap shapes to make a guess, then press CHECK.',
      'A filled square means a shape is right and in the right place. A hollow square means it is in the code, but somewhere else.',
      'Use every clue for your next guess.',
    ],
    example: 'You guessed circle, star, heart and got one filled square: one of those three is in exactly the right place.',
    grows: 'At first the marks sit under each shape. Later they are only a count, the code gets longer, and a shape can be used twice.',
  },
  clocktime: {
    goal: 'Tell the time on ten clocks.',
    steps: [
      'The short hand shows the hour. The long hand shows the minutes.',
      'Read the clock, then tap the time it shows.',
    ],
    example: 'The long hand points straight down at the 6 and the short hand is between the 3 and the 4: it is 3:30.',
    grows: "O'clock first, then half past, then quarter past and quarter to, then every five minutes, then any minute.",
  },
  rhymetime: {
    goal: 'Find the word that rhymes, ten times.',
    steps: [
      'Read the word at the top. Say it out loud.',
      'Tap the word below that rhymes with it: it ends with the same sound.',
    ],
    example: 'cat rhymes with hat. blue rhymes with shoe, even though they are spelt differently.',
    grows: 'Longer words, a word that starts the same to trick the eye, rhymes spelt differently, look-alikes that do not rhyme, then two-syllable words.',
  },
  marketmemory: {
    goal: 'Fill the bag together, one thing each, round the group.',
    steps: [
      'Choose how many players. Each player has a shape with their number on it.',
      'The first player puts one thing in the bag.',
      'The next player taps everything in the bag, in order, then adds one more. Everyone can help remember!',
      'A slip? The bag is shown, and the player carries on from where they were.',
    ],
    example: 'The bag has a star, then a square. Tap the star, tap the square, then add something new.',
    grows: 'A fuller bag, more things to choose from, a shelf that gets shuffled, and things that look more alike.',
  },
  countaround: {
    goal: 'Count to the number at the top together, one number each.',
    steps: [
      'Choose how many players. Take turns: tap the next number.',
      'From level 3, some numbers get a CLAP instead of the number. Tap CLAP for those.',
      'Later, some get a STOMP, and some get BOTH.',
    ],
    example: 'CLAP on every 5: one, two, three, four, CLAP, six, seven …',
    grows: 'A longer count, then claps on fives, then on threes, then claps and stomps together.',
  },
  starjar: {
    goal: 'Fill the star jar together: every right answer adds a star.',
    steps: [
      'Choose how many players, then each player picks their questions: counting dots, adding and taking away, or times tables.',
      'Take turns. Each player answers three questions.',
      'A wrong answer is dimmed. Try again!',
    ],
    example: 'A four-year-old counts dots while a grown-up does times tables, and both fill the same jar.',
    grows: 'More dots to count, bigger sums, and bigger times tables.',
  },
  mazeteam: {
    goal: 'Get the explorer to the flag, twice, as a team.',
    steps: [
      'Choose two, three or four players. Each arrow has a player mark on it: only that player presses it.',
      'The explorer moves one square per press, so talk it through: whose turn is it?',
      'In bigger mazes, get the key first to open the door.',
    ],
    example: 'With two players, one has left and right, the other up and down. "Up, then I go right!"',
    grows: 'Bigger mazes, then a key and a door.',
  },
  echobeat: {
    goal: 'Echo eight rhythms round the group.',
    steps: [
      'Choose how many players. The first player taps a beat on the drum.',
      'The drum lights up to play it back. The next player copies it.',
      'Then it is their turn to make a beat for the player after them.',
      'Not quite? Watch it again and have another go.',
    ],
    example: 'Tap, tap … tap: two close together, then one after a pause. The next player taps the same.',
    grows: 'Longer beats, a closer copy needed, and no marks to show the pattern.',
  },
  cloudhopper: {
    goal: 'Bounce all the way up the clouds to the sun.',
    steps: [
      'The hopper bounces by itself. Hold an arrow, or one side of the sky, to steer it.',
      'Steer under the next cloud up as the hopper comes down. It jumps up through clouds, and lands on top.',
      'Missed? It floats back to the highest cloud it reached. Try again!',
    ],
    example: 'The next cloud is up and to the right: as the hopper rises, hold the right arrow, then let go over the cloud.',
    grows: 'More clouds, narrower and further apart, then clouds that drift, and dashed clouds that puff away after one bounce.',
  },
  paperplane: {
    goal: 'Fly the paper plane through every gap in the clouds, all the way to the field.',
    steps: [
      'Hold the button, or anywhere on the sky, to climb. Let go to glide down.',
      'Line the plane up with the open sky between the clouds before it gets there.',
      'A bump just wobbles the plane through. Keep flying!',
    ],
    example: 'The next gap is lower down: let go early, and hold again just before the gap so the plane flies level through it.',
    grows: 'More clouds, smaller gaps, a faster plane, gaps further up and down, then gaps that bob.',
  },
  minigolf: {
    goal: 'Putt the ball into the cup on six holes.',
    steps: [
      'Put a finger on the green and pull back, away from where you want the ball to go.',
      'The further you pull, the harder the putt. The dots show which way, and how hard.',
      'Let go to putt. Bounce it off a wall to get round a corner!',
      'Water puts the ball back where you hit it from.',
    ],
    example: 'The cup is straight up and close: pull back down just a little, and let go.',
    grows: 'Walls to get round, a sliding bar, water, and a cup tucked in a pocket, with a smaller cup and a faster green.',
  },
  skislalom: {
    goal: 'Ski between the flags of every gate, down to the finish.',
    steps: [
      'Hold an arrow, or one side of the slope, to push off and carve that way. Let go to go straight.',
      'Pass between each pair of flags. A tick means you made it.',
      'Start turning early: carving takes a moment to get going, and a moment to stop.',
      'Mind the trees! A tumble is just a tumble: up you get.',
    ],
    example: 'The next gate is to the right: hold right, and let go just before you are lined up with it.',
    grows: 'More gates, narrower gates, a faster run, gates further across, then trees.',
  },
  spacerocks: {
    goal: 'Break every rock into dust, three waves of them.',
    steps: [
      'Tap where you want to shoot. The ship turns to face it and fires.',
      'A big rock breaks into two smaller ones, and those into two tiny ones.',
      'Rocks drift on while the ship turns and the shot flies: tap where the rock is going, not where it is.',
      'A rock that reaches the ship just bumps off its shield.',
    ],
    example: 'A rock is drifting to the right: tap a little to the right of it.',
    grows: 'More rocks, faster rocks, and a ship that turns more slowly.',
  },
  deepsea: {
    goal: 'Catch eight fish: the one in the bubble each time.',
    steps: [
      'Look at the fish in the bubble: its pattern, and its tail.',
      'Tap to drop the line. It catches the first fish it touches on the way down.',
      'Wait for the right fish to swim under the boat, with nothing in the way above it.',
      'The wrong fish? It goes back in the sea. Try again!',
    ],
    example: 'The bubble shows a stripy fish with a pointy tail: wait until it swims under the boat, then tap.',
    grows: 'More fish at more depths, swimming faster, and more kinds to tell apart.',
  },
  trainswitch: {
    goal: 'Send every train to the station with its shape. Twelve trains.',
    steps: [
      'Tap a junction to flip its points. The arrow shows which way it sends trains.',
      'Each train goes whichever way the points are set when it gets there.',
      'Set each junction for the train that will reach it next, then flip it again for the one behind.',
      'A train at the wrong station just unloads there. On to the next!',
    ],
    example: 'A star train is coming, and the star station is at the bottom: set each junction on its way to point down.',
    grows: 'More stations and junctions, faster trains, and trains closer together.',
  },
  numberbubbles: {
    goal: 'Make eight targets from the numbers in the bubbles.',
    steps: [
      'The target is at the top. Tap the bubbles whose numbers make it.',
      'Tap a bubble again to let it go.',
      'Too much? The bubbles float free. Try another pair!',
      'Bubbles float round again, so there is no rush.',
    ],
    example: 'Make 10: tap a 6 and a 4.',
    grows: 'Bigger numbers, three to add, then take one from another, then times two together.',
  },
  marblemaze: {
    goal: 'Roll the marble up to the star on three boards.',
    steps: [
      'Hold the board where the marble should roll. It rolls towards your finger.',
      'Slide your finger to steer. Let go and the marble slows down.',
      'Go through the door in each wall, and round the holes.',
      'Down a hole? The marble comes back at the last door. Try again!',
    ],
    example: 'The door is on the left: hold just below it, then just above it once the marble is through.',
    grows: 'More walls, narrower doors, more holes close to the way through, and a faster marble.',
  },
  letterdrop: {
    goal: 'Spell five words from their pictures.',
    steps: [
      'Look at the picture. Its word goes in the boxes, one letter at a time.',
      'Letters fall down the screen. Tap the one the word needs next.',
      'The right letter jumps into its box. The underlined box is the next one.',
      'Not that one? It keeps falling, and the one you need will come.',
    ],
    example: 'The picture is a cat: tap C, then A, then T.',
    grows: 'At first the word is written faintly in the boxes. Then just the picture, longer words, more letters that are not in the word, and faster falling.',
  },
  numberpatterns: {
    goal: 'Fill the gap in ten rows of numbers.',
    steps: [
      'Look at how each number is made from the one before.',
      'Work out the rule: add the same, take away, times, or something trickier.',
      'Tap the number that goes in the gap.',
      'Not that one? It is crossed off. Try another.',
    ],
    example: '2, 5, 8, 11, ? — each is 3 more than the last, so the gap is 14.',
    grows: 'More kinds of rule, the gap anywhere in the row, and more numbers to choose from.',
  },
  binarybits: {
    goal: 'Make ten numbers by switching bits on.',
    steps: [
      'Each switch is worth twice the one to its right: 1, 2, 4, 8 and on.',
      'Switch on the ones that add up to the number at the top.',
      'Tap a switch again to turn it off.',
      'When the switches that are on make the number, it moves on to the next.',
    ],
    example: 'Make 13: switch on 8, 4 and 1.',
    grows: 'More switches and bigger numbers, then no running total, then some switches already on.',
  },
  flipit: {
    goal: 'Fill every square on six boards.',
    steps: [
      'Tap a square and it flips, filled or empty.',
      'The squares above, below and either side of it flip too.',
      'Plan your taps so every square ends up filled.',
      'The top of the screen says how few taps can do it.',
    ],
    example: 'An empty cross of five squares: tap its middle once and they all fill.',
    grows: 'Bigger boards, and boards that take more taps.',
  },
  hanoi: {
    goal: 'Move the whole stack to the right-hand peg, twice.',
    steps: [
      'Tap a peg to lift its top disc, then tap the peg to put it on.',
      'Only one disc moves at a time.',
      'A bigger disc can never go on a smaller one. If you try, it goes back.',
      'Plan ahead: to move a big disc, the small ones must be out of the way.',
    ],
    example: 'Three discs: small to the right, middle to the middle, small onto the middle, then big to the right.',
    grows: 'More discs, and fewer spare moves for three stars.',
  },
  balancescale: {
    goal: 'Find the one heavy coin in six puzzles.',
    steps: [
      'Tap a coin to put it on the left pan, again for the right pan, again to take it off.',
      'Tap WEIGH. The heavy side goes down. If the pans are level, the heavy coin is not on them.',
      'When you know which coin it is, tap PICK THE HEAVY ONE, then tap the coin.',
      'Try to find it in as few weighings as the top of the screen says.',
    ],
    example: 'Three coins: weigh 1 against 2. If level, it is 3. If not, it is the side that went down.',
    grows: 'More coins, and more weighings to plan.',
  },
  secretcodes: {
    goal: 'Read six secret messages.',
    steps: [
      'Every letter in the message has been moved the same number of places along the alphabet.',
      'Turn the wheel with BACK ONE and ON ONE. Every letter moves with it.',
      'When the message reads as real words, tap IT SAYS THIS.',
      'Not yet? Keep turning.',
    ],
    example: 'IFMMP moved back one place reads HELLO.',
    grows: 'Letters moved further, longer messages, then only the first word turns, so the rest is read in your head.',
  },
  anglejudge: {
    goal: 'Set ten angles by eye.',
    steps: [
      'The angle to make is written at the top.',
      'Tap or drag to point the line with the square handle. Nudge it a degree with the buttons.',
      'Tap SET IT when it looks right.',
      'If it was off, the angle wanted shows as a dotted line.',
    ],
    example: '90° is a square corner. 45° is half of that.',
    grows: 'Angles in finer steps, less room either side, the fixed line tilted, then angles past a half turn.',
  },
  orbithop: {
    goal: 'Collect twelve stars on the rings round the planet.',
    steps: [
      'Your satellite goes round and round on one of three rings.',
      'Tap IN to hop a ring nearer the planet, OUT to hop further away.',
      'Hop onto the ring the star is on, and it comes to you.',
      'Rocks come round the other way. Hop out of their way. A bump only knocks the shield.',
    ],
    example: 'A rock is coming on your ring and the star is on the outer ring: tap OUT.',
    grows: 'More rocks, coming round faster.',
  },
  dottodot: {
    goal: 'Join the dots to find five pictures.',
    steps: [
      'Every dot has a number.',
      'Tap the dots in order: 1, then 2, then 3.',
      'A line joins each dot to the one before.',
      'Go back to the first dot to finish, and see the picture.',
    ],
    example: 'Tap 1, 2, 3, 4, 5, then 1 again: it is a star!',
    grows: 'More dots, then no ring round the next one, then counting in twos and in fives.',
  },
  beadpattern: {
    goal: 'Finish eight strings of beads.',
    steps: [
      'The beads on the string make a pattern that repeats.',
      'Look at the end of the string: the next bead is missing.',
      'Tap the bead that comes next in the pattern.',
      'Not that one? It stays off the string. Try another.',
    ],
    example: 'Circle, square, circle, square, circle… next is a square.',
    grows: 'Longer patterns, more beads to choose from, two beads to add, then beads that are all one colour.',
  },
  spotchange: {
    goal: 'Find what changed in eight pairs of pictures.',
    steps: [
      'Look at the top picture, then the bottom one.',
      'One thing is different: a shape gone, a new shape, a shape swapped, or one moved.',
      'Tap the place in the bottom picture that changed.',
      'Not there? That place is crossed off. Look again.',
    ],
    example: 'The top picture has a star in the corner and the bottom one does not: tap that corner.',
    grows: 'Bigger pictures, more kinds of change, then the top picture is covered after a few seconds.',
  },
  stopgo: {
    goal: 'Walk across the park five times.',
    steps: [
      'When the round light at the bottom is on, it says go. Hold WALK to walk.',
      'When the middle light comes on, get ready to stop.',
      'When the square light at the top is on, it says stop. Let go of WALK.',
      'Walk on a stop and you take a step back, and wait for the next go.',
    ],
    example: 'The round light is on: hold WALK. The square light comes on: let go straight away.',
    grows: 'Shorter goes, less warning, and less time to let go.',
  },
  mirrorpicture: {
    goal: 'Finish six mirror pictures.',
    steps: [
      'One half of the picture is drawn. The red line is the mirror.',
      'Tap squares on the empty half to fill them in.',
      'Make the empty half look like the drawn half seen in a mirror.',
      'Filled one by mistake? Tap it again to empty it.',
    ],
    example: 'The square touching the line on the left means the square touching the line on the right.',
    grows: 'Taller pictures with more squares, then the mirror line across the middle instead of down.',
  },
};

export function helpFor(gameId: string): GameHelp | undefined {
  return HELP[gameId];
}
