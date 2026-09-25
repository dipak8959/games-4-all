import React, { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { palette } from '../theme/tokens';
import { fonts } from '../theme/type';

/**
 * A game's picture on Home: a tiny version of the game itself, on the game's
 * own colour.
 *
 * Home used to show every game as the same grey square with a small black
 * icon, so twelve games read as twelve empty boxes and nothing said what a
 * game was like before you opened it. Now each tile shows its game mid-play
 * — the cards half turned, a corner of the Sudoku grid, the googly-eyed
 * runner over a puddle — so a child who can't read yet can tell them apart
 * and know what they're choosing.
 *
 * It's drawn from plain views, like the icons, so there are no image files
 * and no drawing library. Every scene is laid out on a 100-unit square and
 * scaled to whatever size the tile is.
 *
 * Colour: the game's own tile colour fills the ground — one per game, never
 * repeated, each clearing 3:1 against the light objects and the ink detail
 * drawn on it (see `tilePalette` in the tokens). The game's objects are drawn in the light
 * ground colour, and the one live thing in each — the lit tile, the turned
 * card, the odd one out — in ink, the same way the games themselves save
 * emphasis for the thing that matters. Colour is never what tells two tiles
 * apart: the picture and the name do that on their own.
 */

type Colours = {
  /** The game's objects. */
  readonly fg: string;
  /** The one live thing in the scene. */
  readonly hi: string;
  /** The tile's own colour, for anything cut out of a live thing. */
  readonly field: string;
  /** The runner's and the car's bodies. */
  readonly body: string;
};

type Draw = (u: number, c: Colours) => React.ReactNode;

// --- primitives, all in 100-unit space -------------------------------------

const at = (u: number, x: number, y: number, w: number, h: number) => ({
  position: 'absolute' as const,
  left: x * u,
  top: y * u,
  width: w * u,
  height: h * u,
});

function Block({ u, x, y, w, h, color }: { u: number; x: number; y: number; w: number; h: number; color: string }) {
  return <View style={[at(u, x, y, w, h), { backgroundColor: color }]} />;
}

function Frame({
  u,
  x,
  y,
  w,
  h,
  color,
  line,
}: {
  u: number;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  line: number;
}) {
  return <View style={[at(u, x, y, w, h), { borderWidth: line * u, borderColor: color }]} />;
}

function Disc({ u, cx, cy, r, color }: { u: number; cx: number; cy: number; r: number; color: string }) {
  return <View style={[at(u, cx - r, cy - r, r * 2, r * 2), { borderRadius: r * u, backgroundColor: color }]} />;
}

function Ring({ u, cx, cy, r, color, line }: { u: number; cx: number; cy: number; r: number; color: string; line: number }) {
  return (
    <View
      style={[at(u, cx - r, cy - r, r * 2, r * 2), { borderRadius: r * u, borderWidth: line * u, borderColor: color }]}
    />
  );
}

/** An upward triangle whose apex is at (cx, top). */
function Peak({ u, cx, top, w, h, color }: { u: number; cx: number; top: number; w: number; h: number; color: string }) {
  return (
    <View
      style={{
        position: 'absolute',
        left: (cx - w / 2) * u,
        top: top * u,
        width: 0,
        height: 0,
        borderLeftWidth: (w / 2) * u,
        borderRightWidth: (w / 2) * u,
        borderBottomWidth: h * u,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: color,
      }}
    />
  );
}

function Glyph({
  u,
  x,
  y,
  w,
  size,
  color,
  children,
}: {
  u: number;
  x: number;
  y: number;
  w: number;
  size: number;
  color: string;
  children: string;
}) {
  return (
    <Text
      allowFontScaling={false}
      style={{
        position: 'absolute',
        left: x * u,
        top: y * u,
        width: w * u,
        textAlign: 'center',
        fontFamily: fonts.heavy,
        fontSize: size * u,
        lineHeight: size * 1.15 * u,
        color,
      }}
    >
      {children}
    </Text>
  );
}

/** An upside-down cup: a trapezoid, narrow at the top, its base at `y + h`. */
function Cup({ u, cx, y, top, bottom, h, color }: { u: number; cx: number; y: number; top: number; bottom: number; h: number; color: string }) {
  const side = ((bottom - top) / 2) * u;
  return (
    <View
      style={{
        position: 'absolute',
        left: (cx - bottom / 2) * u,
        top: y * u,
        // The box includes its borders, so it is the full base width.
        width: bottom * u,
        height: 0,
        borderBottomWidth: h * u,
        borderLeftWidth: side,
        borderRightWidth: side,
        borderBottomColor: color,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
      }}
    />
  );
}

/** Googly eyes: two whites and two pupils looking ahead. */
function Eyes({ u, x, y, r }: { u: number; x: number; y: number; r: number }) {
  return (
    <>
      <Disc u={u} cx={x} cy={y} r={r} color={palette.bg} />
      <Disc u={u} cx={x + r * 2.3} cy={y} r={r} color={palette.bg} />
      <Disc u={u} cx={x + r * 0.4} cy={y} r={r * 0.5} color={palette.ink} />
      <Disc u={u} cx={x + r * 2.7} cy={y} r={r * 0.5} color={palette.ink} />
    </>
  );
}

// --- one scene per game ----------------------------------------------------

const SCENES: Readonly<Record<string, Draw>> = {
  // Two cards still face down, two turned up showing a match.
  memory: (u, c) => (
    <>
      <Block u={u} x={16} y={16} w={30} h={30} color={c.fg} />
      <Frame u={u} x={54} y={16} w={30} h={30} color={c.fg} line={3} />
      <Disc u={u} cx={69} cy={31} r={8} color={c.hi} />
      <Frame u={u} x={16} y={54} w={30} h={30} color={c.fg} line={3} />
      <Disc u={u} cx={31} cy={69} r={8} color={c.hi} />
      <Block u={u} x={54} y={54} w={30} h={30} color={c.fg} />
    </>
  ),
  // A handful of things to count, the last one being counted.
  counting: (u, c) => (
    <>
      {[
        [28, 30],
        [50, 24],
        [72, 32],
        [34, 54],
        [60, 52],
        [46, 76],
      ].map(([x, y]) => (
        <Disc key={`${x}${y}`} u={u} cx={x} cy={y} r={8.5} color={c.fg} />
      ))}
      <Disc u={u} cx={72} cy={74} r={8.5} color={c.hi} />
    </>
  ),
  // Two shapes above two baskets, one already sorted.
  shapes: (u, c) => (
    <>
      <Peak u={u} cx={30} top={20} w={28} h={24} color={c.hi} />
      <Disc u={u} cx={70} cy={32} r={12} color={c.fg} />
      {[14, 54].map((x) => (
        <React.Fragment key={x}>
          <Block u={u} x={x} y={60} w={3} h={24} color={c.fg} />
          <Block u={u} x={x} y={81} w={32} h={3} color={c.fg} />
          <Block u={u} x={x + 29} y={60} w={3} h={24} color={c.fg} />
        </React.Fragment>
      ))}
      <Peak u={u} cx={30} top={66} w={16} h={14} color={c.fg} />
    </>
  ),
  // C A T in tiles, the middle one just placed.
  wordbuilder: (u, c) => (
    <>
      {['C', 'A', 'T'].map((letter, i) =>
        i === 1 ? (
          <React.Fragment key={letter}>
            <Block u={u} x={12 + i * 27} y={36} w={24} h={28} color={c.hi} />
            <Glyph u={u} x={12 + i * 27} y={38} w={24} size={19} color={c.field}>
              {letter}
            </Glyph>
          </React.Fragment>
        ) : (
          <React.Fragment key={letter}>
            <Frame u={u} x={12 + i * 27} y={36} w={24} h={28} color={c.fg} line={2.5} />
            <Glyph u={u} x={12 + i * 27} y={38} w={24} size={19} color={c.fg}>
              {letter}
            </Glyph>
          </React.Fragment>
        ),
      )}
    </>
  ),
  // A corner of a grid, one cell being filled.
  sudoku: (u, c) => (
    <>
      <Frame u={u} x={14} y={14} w={72} h={72} color={c.fg} line={3.5} />
      <Block u={u} x={48.75} y={14} w={2.5} h={72} color={c.fg} />
      <Block u={u} x={14} y={48.75} w={72} h={2.5} color={c.fg} />
      {[32, 68].map((p) => (
        <React.Fragment key={p}>
          <Block u={u} x={p} y={14} w={1} h={72} color={c.fg} />
          <Block u={u} x={14} y={p} w={72} h={1} color={c.fg} />
        </React.Fragment>
      ))}
      <Block u={u} x={51} y={33} w={16} h={16} color={c.hi} />
      {[
        [0, 0, '1'],
        [2, 0, '3'],
        [1, 1, '4'],
        [3, 2, '2'],
        [0, 3, '4'],
        [2, 3, '1'],
      ].map(([col, row, n]) => (
        <Glyph key={`${col}${row}`} u={u} x={14 + Number(col) * 18} y={17 + Number(row) * 18} w={18} size={12} color={c.fg}>
          {String(n)}
        </Glyph>
      ))}
    </>
  ),
  // Three marks in a row, the last one lit.
  patternplay: (u, c) => (
    <>
      <Disc u={u} cx={22} cy={50} r={10} color={c.fg} />
      <Ring u={u} cx={48} cy={50} r={10} color={c.fg} line={3.5} />
      <Block u={u} x={62} y={36} w={28} h={28} color={c.hi} />
      <Block u={u} x={69} y={43} w={14} h={14} color={c.field} />
    </>
  ),
  // A sum and its choices, the right one picked.
  numbercrunch: (u, c) => (
    <>
      <Glyph u={u} x={0} y={24} w={100} size={26} color={c.fg}>
        7+5
      </Glyph>
      <Frame u={u} x={14} y={62} w={22} h={22} color={c.fg} line={2.5} />
      <Block u={u} x={39} y={62} w={22} h={22} color={c.hi} />
      <Frame u={u} x={64} y={62} w={22} h={22} color={c.fg} line={2.5} />
      <Glyph u={u} x={14} y={66} w={22} size={11} color={c.fg}>
        11
      </Glyph>
      <Glyph u={u} x={39} y={66} w={22} size={11} color={c.field}>
        12
      </Glyph>
      <Glyph u={u} x={64} y={66} w={22} size={11} color={c.fg}>
        13
      </Glyph>
    </>
  ),
  // An outline half filled, and the piece that finishes it.
  shapebuilder: (u, c) => (
    <>
      <Block u={u} x={16} y={20} w={22} h={22} color={c.fg} />
      <Block u={u} x={38} y={20} w={22} h={22} color={c.fg} />
      <Frame u={u} x={16} y={42} w={44} h={22} color={c.fg} line={2} />
      <Frame u={u} x={60} y={42} w={22} h={22} color={c.fg} line={2} />
      <Block u={u} x={46} y={70} w={16} h={16} color={c.hi} />
      <Block u={u} x={62} y={70} w={16} h={16} color={c.hi} />
      <Block u={u} x={62} y={54} w={16} h={16} color={c.hi} />
    </>
  ),
  // The runner mid-hop over a puddle.
  puddlehop: (u, c) => (
    <>
      <Block u={u} x={10} y={74} w={80} h={3} color={c.fg} />
      <Block u={u} x={50} y={72} w={30} h={7} color={c.hi} />
      <Block u={u} x={30} y={28} w={22} h={18} color={c.body} />
      <Block u={u} x={34} y={46} w={4} h={7} color={c.fg} />
      <Block u={u} x={44} y={46} w={4} h={5} color={c.fg} />
      <Eyes u={u} x={35} y={34} r={3.4} />
    </>
  ),
  // The car on its road, a rival ahead and a cone to steer round.
  lanedash: (u, c) => (
    <>
      {[36, 64].map((x) =>
        [6, 21, 36, 51, 66, 81].map((y) => <Block key={`${x}${y}`} u={u} x={x - 1} y={y} w={2} h={8} color={c.fg} />),
      )}
      <Peak u={u} cx={80} top={22} w={16} h={14} color={c.hi} />
      <Block u={u} x={13} y={30} w={14} h={22} color={c.fg} />
      {[57, 71].map((y) =>
        [38, 59].map((x) => <Block key={`${x}${y}`} u={u} x={x} y={y} w={3} h={7} color={c.hi} />),
      )}
      <Block u={u} x={41} y={54} w={18} h={28} color={c.body} />
      <Eyes u={u} x={45} y={60} r={3} />
    </>
  ),
  // Three squares and the one that isn't.
  oddoneout: (u, c) => (
    <>
      <Block u={u} x={18} y={18} w={24} h={24} color={c.fg} />
      <Block u={u} x={58} y={18} w={24} h={24} color={c.fg} />
      <Block u={u} x={18} y={58} w={24} h={24} color={c.fg} />
      <View style={[at(u, 61, 61, 18, 18), { backgroundColor: c.hi, transform: [{ rotate: '45deg' }] }]} />
    </>
  ),
  // A grid with three squares lit.
  memorygrid: (u, c) => (
    <>
      {Array.from({ length: 9 }, (_, i) => {
        const row = Math.floor(i / 3);
        const col = i % 3;
        const lit = (row === 0 && col === 1) || (row === 2 && col === 0) || (row === 1 && col === 2);
        const x = 17 + col * 23;
        const y = 17 + row * 23;
        return lit ? (
          <Block key={i} u={u} x={x} y={y} w={20} h={20} color={c.hi} />
        ) : (
          <Frame key={i} u={u} x={x} y={y} w={20} h={20} color={c.fg} line={2.5} />
        );
      })}
    </>
  ),
  // A house, and its shadow.
  shadowmatch: (u, c) => (
    <>
      <Block u={u} x={16} y={38} w={24} h={22} color={c.fg} />
      <Peak u={u} cx={28} top={20} w={34} h={18} color={c.fg} />
      <Block u={u} x={60} y={62} w={24} h={22} color={c.hi} />
      <Peak u={u} cx={72} top={44} w={34} h={18} color={c.hi} />
    </>
  ),
  // Three cups, the middle one lifted off the ball.
  whichcup: (u, c) => (
    <>
      <Block u={u} x={8} y={78} w={84} h={3} color={c.fg} />
      <Cup u={u} cx={22} y={52} top={14} bottom={24} h={26} color={c.fg} />
      <Cup u={u} cx={50} y={26} top={14} bottom={24} h={26} color={c.fg} />
      <Cup u={u} cx={78} y={52} top={14} bottom={24} h={26} color={c.fg} />
      <Disc u={u} cx={50} cy={70} r={8} color={c.hi} />
    </>
  ),
  // A line put in order, biggest first, the smallest still to go.
  bigtosmall: (u, c) => (
    <>
      <Block u={u} x={8} y={78} w={84} h={3} color={c.fg} />
      <Block u={u} x={10} y={42} w={32} h={36} color={c.fg} />
      <Block u={u} x={46} y={54} w={22} h={24} color={c.fg} />
      <Block u={u} x={72} y={62} w={16} h={16} color={c.hi} />
    </>
  ),
  // Numbered tiles with a gap, one tile sliding into it.
  tileslide: (u, c) => (
    <>
      {[
        [0, 0, '1'],
        [1, 0, '2'],
        [2, 0, '3'],
        [0, 1, '4'],
        [1, 1, '5'],
        [2, 1, '6'],
        [0, 2, '7'],
      ].map(([col, row, n]) => (
        <React.Fragment key={String(n)}>
          <Block u={u} x={16 + Number(col) * 23} y={16 + Number(row) * 23} w={21} h={21} color={c.fg} />
          <Glyph u={u} x={16 + Number(col) * 23} y={19 + Number(row) * 23} w={21} size={12} color={c.field}>
            {String(n)}
          </Glyph>
        </React.Fragment>
      ))}
      <Block u={u} x={50} y={62} w={21} h={21} color={c.hi} />
      <Glyph u={u} x={50} y={65} w={21} size={12} color={c.fg}>
        8
      </Glyph>
    </>
  ),
  // A ladder, one rung lit.
  wordladder: (u, c) => (
    <>
      <Block u={u} x={26} y={10} w={4} h={80} color={c.fg} />
      <Block u={u} x={70} y={10} w={4} h={80} color={c.fg} />
      {[22, 40, 58, 76].map((y) => (
        <Block key={y} u={u} x={30} y={y} w={40} h={4} color={y === 40 ? c.hi : c.fg} />
      ))}
    </>
  ),
};

/** Hue of a `#rrggbb` colour, in degrees. */
function hueOf(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

/** How far apart two colours are round the colour wheel. */
export function hueGap(a: string, b: string): number {
  const gap = Math.abs(hueOf(a) - hueOf(b));
  return Math.min(gap, 360 - gap);
}

/** Game ids that have a scene — exported so the tests can hold every game in
 *  the catalogue to having one. */
export const GAMES_WITH_ART: readonly string[] = Object.keys(SCENES);

/**
 * A game's picture, filling its container: give the parent a size (or an
 * aspect ratio) and the scene scales to it.
 */
export function GameArt({ id, color }: { readonly id: string; readonly color: string }) {
  const [size, setSize] = useState(0);
  const draw = SCENES[id];
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize(Math.min(width, height));
  };
  const colours: Colours = {
    fg: palette.bg,
    hi: palette.ink,
    field: color,
    // The runner and the car keep their red, except on a tile close enough
    // to red that they would vanish into it, where they turn ink.
    body: hueGap(color, palette.accent) < 45 ? palette.ink : palette.accent,
  };
  return (
    <View style={[styles.fill, { backgroundColor: color }]} onLayout={onLayout} {...hidden}>
      {size > 0 && draw ? (
        <View style={{ width: size, height: size }}>{draw(size / 100, colours)}</View>
      ) : null}
    </View>
  );
}

/** The picture sits next to the game's name, which is what gets announced. */
const hidden = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants' as const,
};

const styles = StyleSheet.create({
  fill: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
