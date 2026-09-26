import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { GAMES_META } from '../src/games/catalog.ts';
import { join } from 'node:path';

import {
  font,
  gutter,
  hitTarget,
  palette,
  playColor,
  playPalette,
  tilePalette,
  radius,
  rule,
  space,
} from '../src/theme/tokens.ts';

/** Every game screen, which is where a design drifts first. */
const GAME_SCREENS = [
  'src/games/ballooncount/BalloonCountScreen.tsx',
  'src/games/bigtosmall/BigToSmallScreen.tsx',
  'src/games/bouncebricks/BounceBricksScreen.tsx',
  'src/games/clocktime/ClockTimeScreen.tsx',
  'src/games/codecracker/CodeCrackerScreen.tsx',
  'src/games/counting/CountingScreen.tsx',
  'src/games/duckcrossing/DuckCrossingScreen.tsx',
  'src/games/fruitcatch/FruitCatchScreen.tsx',
  'src/games/hoopshot/HoopShotScreen.tsx',
  'src/games/hungryworm/HungryWormScreen.tsx',
  'src/games/lanedash/LaneDashScreen.tsx',
  'src/games/maze/MazeScreen.tsx',
  'src/games/memory/MemoryScreen.tsx',
  'src/games/memorygrid/MemoryGridScreen.tsx',
  'src/games/numbercrunch/NumberCrunchScreen.tsx',
  'src/games/oddoneout/OddOneOutScreen.tsx',
  'src/games/patternplay/PatternPlayScreen.tsx',
  'src/games/peekaboo/PeekabooScreen.tsx',
  'src/games/puddlehop/PuddleHopScreen.tsx',
  'src/games/rhymetime/RhymeTimeScreen.tsx',
  'src/games/shadowmatch/ShadowMatchScreen.tsx',
  'src/games/shapebuilder/ShapeBuilderScreen.tsx',
  'src/games/shapes/ShapesScreen.tsx',
  'src/games/softlanding/SoftLandingScreen.tsx',
  'src/games/sudoku/SudokuScreen.tsx',
  'src/games/talltower/TallTowerScreen.tsx',
  'src/games/tileslide/TileSlideScreen.tsx',
  'src/games/treasurehunt/TreasureHuntScreen.tsx',
  'src/games/waterworks/WaterWorksScreen.tsx',
  'src/games/whichcup/WhichCupScreen.tsx',
  'src/games/wordbuilder/WordBuilderScreen.tsx',
  'src/games/wordladder/WordLadderScreen.tsx',
];

/**
 * The `Games Hub` design handoff, held in place.
 *
 * Its rules are load-bearing rather than decorative — zero radius, flat
 * fills, structure carried by 2px and 1px rules, one accent used sparingly —
 * so they are asserted here the same way the safety rules are asserted by
 * `npm run safety`. A future "just round this one corner" has to argue with
 * a failing test rather than slip in unnoticed.
 */

test('the palette is the handoff\'s, exactly', () => {
  assert.equal(palette.bg, '#f3f2f2', 'ground');
  assert.equal(palette.surface, '#eae9e9', 'surface');
  assert.equal(palette.ink, '#201e1d', 'ink');
  assert.equal(palette.inkSoft, '#605d5d', 'muted text');
  assert.equal(palette.border, 'rgba(32,30,29,0.4)', 'divider');
  assert.equal(palette.accent, '#ec3013');
  assert.equal(palette.accentHover, '#dd2b0f');
  assert.equal(palette.accentPressed, '#ae1800');
  assert.equal(palette.accentText, '#ae1800', 'body-size red on a light ground');
  assert.equal(palette.accentTint, '#ffe0d9');
  assert.equal(palette.accentTintText, '#7c1405');
  assert.equal(palette.surfaceAlt, '#d7d3d3', 'placeholder fill');
});

test('radius is zero, everywhere', () => {
  assert.equal(radius, 0);
});

test('rules are 2px between sections and 1px between rows', () => {
  assert.deepEqual({ ...rule }, { major: 2, hair: 1 });
});

test('spacing is the handoff\'s 4/8/12/16/24/32, on a 16px gutter', () => {
  assert.deepEqual(Object.values(space), [4, 8, 12, 16, 24, 32]);
  assert.equal(gutter, 16);
});

test('the type scale is the handoff\'s, exactly', () => {
  // Every one of these is a size the wireframe actually sets. Substituting
  // a scale of my own here is what made the design stop looking like the
  // design, so it is asserted the same way the palette is.
  assert.equal(font.display, 42);
  assert.equal(font.h2, 32);
  assert.equal(font.h3, 25);
  assert.equal(font.h5, 16);
  assert.equal(font.body, 15);
  assert.equal(font.secondary, 13);
  assert.equal(font.meta, 12);
  assert.equal(font.monoLg, 11);
  assert.equal(font.mono, 10);
  assert.equal(font.monoSm, 9);
});

test('Archivo ships in the repository, both weights, with its licence', () => {
  // The handoff asks for Archivo bundled locally rather than fetched, and
  // this app cannot fetch anything at all — so the files have to be here.
  for (const file of ['Archivo-Regular.ttf', 'Archivo-ExtraBold.ttf', 'OFL.txt']) {
    assert.ok(statSync(join('assets/fonts', file)).size > 0, `assets/fonts/${file} is missing`);
  }
  const licence = readFileSync('assets/fonts/OFL.txt', 'utf8');
  assert.match(licence, /SIL Open Font License/, 'the bundled font must carry its licence');
});

test('weight comes from the face, never from fontWeight', () => {
  // The design has two weights, 400 and 800, and nothing in between. On
  // Android a custom family does not switch faces on `fontWeight` at all,
  // and on web asking 800 of an already-extra-bold face makes the browser
  // synthesise a second bolding — which is what "too bold in places, too
  // light in others" actually was. So the face is named directly and
  // `fontWeight` appears nowhere in the app's styles.
  const offenders = sourceFiles('src').filter((path) =>
    /fontWeight:/.test(readFileSync(path, 'utf8')),
  );
  assert.deepEqual(offenders, [], `fontWeight found in: ${offenders.join(', ')}`);
});

test('only the two faces the design defines are ever set', () => {
  const declared = new Set<string>();
  for (const path of sourceFiles('src')) {
    for (const match of readFileSync(path, 'utf8').matchAll(/fonts\.(\w+)/g)) {
      declared.add(match[1]);
    }
  }
  declared.delete('mono'); // machine labels, set in the platform monospace
  assert.deepEqual([...declared].sort(), ['heavy', 'regular']);
});

test('touch targets stay at 72dp — larger than the handoff draws them, never smaller', () => {
  // The handoff's rows are 44-52px. This app's floor is higher on purpose
  // (SAFETY.md, "Big targets"), so the two only ever disagree in the safe
  // direction.
  assert.ok(hitTarget >= 52, `${hitTarget} is below the handoff's own CTA height`);
});

test('every game screen is in the catalogue, and the catalogue in the tests', () => {
  // If a game is added and this list is not updated, the checks below would
  // quietly stop covering it — so the list is checked against the directory
  // rather than trusted.
  const onDisk = sourceFiles('src/games').filter((path) => path.endsWith('Screen.tsx'));
  assert.deepEqual(onDisk.sort(), [...GAME_SCREENS].sort());
});

/**
 * Find the Pairs is the one game whose tappable things are not answers: its
 * cards *are* the board, sized to the screen and flipped in place, so it
 * lays them out itself. It still takes every fill, rule and type style from
 * the tokens, which the checks below enforce.
 */
const BUILDS_ITS_OWN_BOARD = ['src/games/memory/MemoryScreen.tsx'];

test('no game draws its own buttons', () => {
  // Seven games each drawing their own tiles is how the design drifted into
  // seven dialects. A game says what its answers are; `GameStage` says what
  // an answer looks like.
  for (const path of GAME_SCREENS) {
    if (BUILDS_ITS_OWN_BOARD.includes(path)) continue;
    const source = readFileSync(path, 'utf8');
    assert.match(source, /components\/GameStage/, `${path} builds its own controls`);
  }
});

test('the board exemption stays honest', () => {
  // If an exempted game starts using the shared answer button after all, it
  // should come off this list rather than sit there granting a permission
  // nothing needs.
  for (const path of BUILDS_ITS_OWN_BOARD) {
    assert.ok(
      !readFileSync(path, 'utf8').includes('AnswerButton'),
      `${path} no longer needs its exemption`,
    );
  }
});

test('no game invents a colour', () => {
  // Colour inside a game is spent only where colour is the content. A raw
  // hex anywhere in a screen means someone reached past the palette.
  const offenders = sourceFiles('src')
    .filter((path) => path !== 'src/theme/tokens.ts')
    .filter((path) => /#[0-9a-fA-F]{3,8}\b/.test(readFileSync(path, 'utf8')));

  assert.deepEqual(offenders, [], `raw colour literals in: ${offenders.join(', ')}`);
});

test('press feedback is a tint, never a bounce', () => {
  // The design's interaction states are a tint from the accent ramp and a
  // focus ring — not a spring. Motion stays under 200ms and out of the way.
  const offenders = sourceFiles('src').filter((path) =>
    /transform: \[\{ scale/.test(readFileSync(path, 'utf8')),
  );
  assert.deepEqual(offenders, [], `scale-on-press found in: ${offenders.join(', ')}`);
});

test('borders are 1px or 2px — the design has no third weight', () => {
  const offenders: string[] = [];
  for (const path of sourceFiles('src')) {
    for (const match of readFileSync(path, 'utf8').matchAll(/border\w*Width: (\d+)/g)) {
      if (match[1] !== '0') offenders.push(`${path} (${match[1]}px)`);
    }
  }
  assert.deepEqual(offenders, [], `hard-coded border widths: ${offenders.join(', ')}`);
});

test('play colours survive the flattening, and resolve safely', () => {
  // Chrome went to ink, but colour still identifies people and play objects:
  // a four-year-old picks "the blue one" long before they can read a name,
  // and Sort It Out literally sorts by colour.
  assert.ok(Object.keys(playPalette).length >= 5);
  assert.equal(playColor('sky'), playPalette.sky);
  assert.equal(playColor('not-a-colour'), playPalette.sky, 'unknown keys fall back, never crash');
});

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return path.endsWith('.ts') || path.endsWith('.tsx') ? [path] : [];
  });
}

/**
 * Circles are geometry, not rounded corners: the icon set draws rings and
 * dots, Sort It Out draws an actual circle to sort, and the Puddle Hop runner
 * and the Lane Dash car have round googly eyes (a square eye is not a joke anyone gets), a
 * snowman or a lollipop in Shadow Match is round, and so is the ball under
 * the cup — as are fruit, balloons, the maze explorer's eyes and key ring,
 * and a flower's petals — and the arcade games' balls, the worm's eyes and its
 * apple, and a peeking pal's eyes. Everything else in the app is square — the
 * runner's body, the rocket and its window included. A duckling is round,
 * and so is a clock face.
 */
const MAY_DRAW_CIRCLES = [
  'src/components/Icon.tsx',
  'src/components/GameArt.tsx',
  'src/games/shapes/Shape.tsx',
  'src/games/patternplay/PatternMark.tsx',
  'src/games/puddlehop/PuddleHopScreen.tsx',
  'src/games/lanedash/LaneDashScreen.tsx',
  'src/games/shadowmatch/Figure.tsx',
  'src/games/whichcup/WhichCupScreen.tsx',
  'src/games/fruitcatch/FruitCatchScreen.tsx',
  'src/games/maze/MazeScreen.tsx',
  'src/games/ballooncount/BalloonCountScreen.tsx',
  'src/games/waterworks/WaterWorksScreen.tsx',
  'src/games/bouncebricks/BounceBricksScreen.tsx',
  'src/games/hungryworm/HungryWormScreen.tsx',
  'src/games/peekaboo/PeekabooScreen.tsx',
  'src/games/hoopshot/HoopShotScreen.tsx',
  'src/games/duckcrossing/DuckCrossingScreen.tsx',
  'src/games/clocktime/ClockTimeScreen.tsx',
];

test('nothing rounds a corner', () => {
  const offenders = sourceFiles('src')
    .filter((path) => !MAY_DRAW_CIRCLES.includes(path))
    .filter((path) => readFileSync(path, 'utf8').includes('borderRadius'));

  assert.deepEqual(offenders, [], `borderRadius found in: ${offenders.join(', ')}`);
});

test('nothing casts a shadow', () => {
  const shadowProps = /shadowColor|shadowOpacity|shadowRadius|shadowOffset|elevation:/;
  const offenders = sourceFiles('src').filter((path) => shadowProps.test(readFileSync(path, 'utf8')));

  assert.deepEqual(offenders, [], `shadow styling found in: ${offenders.join(', ')}`);
});

test('nothing draws a gradient, and no gradient library is installed', () => {
  const offenders = sourceFiles('src').filter((path) =>
    /LinearGradient|expo-linear-gradient/.test(readFileSync(path, 'utf8')),
  );
  assert.deepEqual(offenders, [], `gradient usage found in: ${offenders.join(', ')}`);

  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
    dependencies?: Record<string, string>;
  };
  assert.ok(
    !('expo-linear-gradient' in (pkg.dependencies ?? {})),
    'the flat design needs no gradient dependency',
  );
});

test('every game has its own picture for Home', () => {
  // Every tile used to be the same grey box with a small icon. Each game now
  // shows a tiny version of itself; a new game without one would fall back to
  // an empty coloured square, so this fails first.
  const art = readFileSync('src/components/GameArt.tsx', 'utf8');
  const scenes = art.slice(art.indexOf('const SCENES'), art.indexOf('/** Hue of a'));
  for (const game of GAMES_META) {
    assert.match(scenes, new RegExp(`\\n  ${game.id}: \\(u, c\\)`), `${game.title} has no picture`);
  }
});

/** WCAG relative luminance and contrast, for the tile checks below. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test('no two games share a tile colour', () => {
  const colours = GAMES_META.map((g) => g.color);
  const repeated = colours.filter((c, i) => colours.indexOf(c) !== i);
  assert.deepEqual(repeated, [], `tile colours used twice: ${repeated.join(', ')}`);
  const allowed = Object.values(tilePalette) as string[];
  for (const game of GAMES_META) {
    assert.ok(allowed.includes(game.color), `${game.title}'s colour is not from the tile palette`);
  }
  // Room for at least one more game before the palette needs to grow.
  assert.ok(allowed.length > GAMES_META.length, 'the tile palette is full; add a colour for the next game');
});

test('every tile colour lets both the picture and its detail show', () => {
  // The picture is drawn in the light ground colour with its live detail in
  // ink, so a tile has to clear the WCAG 3:1 for graphics against both. The
  // old yellow tile left white dots at 1.8:1.
  for (const [name, colour] of Object.entries(tilePalette)) {
    assert.ok(contrast(colour, palette.bg) >= 3, `${name}: ${contrast(colour, palette.bg).toFixed(2)}:1 against the picture`);
    assert.ok(contrast(colour, palette.ink) >= 3, `${name}: ${contrast(colour, palette.ink).toFixed(2)}:1 against the ink detail`);
  }
});
