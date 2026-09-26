import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { palette } from '../theme/tokens';

/**
 * The app's icon set, drawn from plain `View`s.
 *
 * Every mark here is composed from rectangles, circles and CSS-style
 * triangles — no image files, no icon font, and no new dependency to audit
 * (see SAFETY.md's banned-dependency check). That keeps the "nothing
 * arrives from outside" guarantee literal: an icon is geometry the app
 * draws, not an asset it ships or fetches.
 *
 * It replaces the emoji this app used to navigate by. Emoji were a
 * reasonable start — free, recognisable, no licensing — but they render
 * differently on every platform and carry a tone the rest of the interface
 * had outgrown.
 *
 * Icons are decorative by default: they sit beside a real text label
 * everywhere they appear, so they are hidden from screen readers rather
 * than given their own name.
 */

export type IconName =
  // Navigation and controls
  | 'search'
  | 'close'
  | 'settings'
  | 'back'
  | 'plus'
  | 'trash'
  | 'pencil'
  | 'lock'
  | 'clock'
  | 'user'
  | 'home'
  | 'check'
  | 'replay'
  | 'star'
  | 'chevron'
  | 'shield'
  | 'offline'
  // One distinct mark per game, and the "all categories" mark
  | 'all'
  | 'pairs'
  | 'count'
  | 'shapes'
  | 'letters'
  | 'grid'
  | 'sequence'
  | 'math'
  | 'pieces'
  | 'hop'
  | 'race'
  | 'odd'
  | 'memorygrid'
  | 'shadow'
  | 'cups'
  | 'bigsmall'
  | 'slide'
  | 'ladder'
  | 'catch'
  | 'maze'
  | 'balloons'
  | 'treasure'
  | 'pipes'
  | 'arcade'
  | 'bricks'
  | 'worm'
  | 'peekaboo'
  | 'hoop'
  | 'lander'
  | 'tower'
  | 'duck'
  | 'code'
  | 'clockface'
  | 'rhyme';

export function Icon({
  name,
  size = 24,
  color = palette.ink,
}: {
  readonly name: IconName;
  readonly size?: number;
  readonly color?: string;
}) {
  // Stroke scales with the icon so a 14px mark doesn't look like a smudge
  // and a 46px one doesn't look hollow.
  const s = Math.max(2, Math.round(size * 0.1));
  const box = { width: size, height: size };

  switch (name) {
    case 'search':
      return (
        <View style={[styles.center, box]} {...hidden}>
          <View
            style={{
              width: size * 0.62,
              height: size * 0.62,
              borderRadius: size,
              borderWidth: s,
              borderColor: color,
              marginTop: -size * 0.08,
              marginLeft: -size * 0.08,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: s,
              height: size * 0.3,
              backgroundColor: color,
              right: size * 0.1,
              bottom: size * 0.06,
              transform: [{ rotate: '-45deg' }],
            }}
          />
        </View>
      );

    case 'close':
      return (
        <View style={[styles.center, box]} {...hidden}>
          <Bar w={size * 0.78} h={s} color={color} rotate="45deg" />
          <Bar w={size * 0.78} h={s} color={color} rotate="-45deg" absolute />
        </View>
      );

    // Three stacked rules of different lengths — the "sliders" mark, which
    // reads as settings without needing a gear's teeth.
    case 'settings':
      return (
        <View style={[styles.center, box, { gap: size * 0.14 }]} {...hidden}>
          <View style={{ width: size * 0.8, height: s, backgroundColor: color }} />
          <View style={{ width: size * 0.55, height: s, backgroundColor: color }} />
          <View style={{ width: size * 0.68, height: s, backgroundColor: color }} />
        </View>
      );

    case 'back':
      return (
        <View style={[styles.center, box]} {...hidden}>
          <View
            style={{
              width: size * 0.42,
              height: size * 0.42,
              borderLeftWidth: s,
              borderBottomWidth: s,
              borderColor: color,
              marginLeft: size * 0.12,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      );

    // The same corner as 'back', turned to point the other way. It sits at
    // the end of a primary action, where the handoff puts a chevron.
    case 'chevron':
      return (
        <View style={[styles.center, box]} {...hidden}>
          <View
            style={{
              width: size * 0.42,
              height: size * 0.42,
              borderRightWidth: s,
              borderTopWidth: s,
              borderColor: color,
              marginRight: size * 0.12,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      );

    // A crest: square shoulders over a point. Marks everything a grown-up
    // has to pass the gate to reach.
    case 'shield':
      return (
        <View style={[styles.center, box]} {...hidden}>
          <View style={{ width: size * 0.62, height: size * 0.42, backgroundColor: color }} />
          <View
            style={{
              width: 0,
              height: 0,
              borderLeftWidth: size * 0.31,
              borderRightWidth: size * 0.31,
              borderTopWidth: size * 0.3,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderTopColor: color,
            }}
          />
        </View>
      );

    // The universal "no": a ring with a bar struck through it. This app
    // never reaches the network, and this mark says so at 16px where a
    // drawn cloud would only smudge.
    case 'offline':
      return (
        <View style={[styles.center, box]} {...hidden}>
          <View
            style={{
              width: size * 0.84,
              height: size * 0.84,
              borderRadius: size,
              borderWidth: s,
              borderColor: color,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: size * 0.84,
              height: s,
              backgroundColor: color,
              transform: [{ rotate: '-45deg' }],
            }}
          />
        </View>
      );

    case 'plus':
    case 'math':
      return (
        <View style={[styles.center, box]} {...hidden}>
          <View style={{ width: size * 0.72, height: s, backgroundColor: color }} />
          <View style={{ position: 'absolute', width: s, height: size * 0.72, backgroundColor: color }} />
        </View>
      );

    case 'trash':
      return (
        <View style={[styles.center, box, { gap: size * 0.06 }]} {...hidden}>
          <View style={{ width: size * 0.7, height: s, backgroundColor: color }} />
          <View
            style={{
              width: size * 0.54,
              height: size * 0.56,
              borderWidth: s,
              borderTopWidth: 0,
              borderColor: color,
            }}
          />
        </View>
      );

    case 'pencil':
      return (
        <View style={[styles.center, box]} {...hidden}>
          <View
            style={{
              width: size * 0.24,
              height: size * 0.62,
              borderWidth: s,
              borderColor: color,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      );

    case 'lock':
      return (
        <View style={[styles.center, box]} {...hidden}>
          <View
            style={{
              width: size * 0.4,
              height: size * 0.26,
              borderWidth: s,
              borderBottomWidth: 0,
              borderColor: color,
              borderTopLeftRadius: size * 0.2,
              borderTopRightRadius: size * 0.2,
            }}
          />
          <View style={{ width: size * 0.64, height: size * 0.42, backgroundColor: color }} />
        </View>
      );

    case 'clock':
      return (
        <View style={[styles.center, box]} {...hidden}>
          <View
            style={{
              width: size * 0.82,
              height: size * 0.82,
              borderRadius: size,
              borderWidth: s,
              borderColor: color,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: s,
              height: size * 0.24,
              backgroundColor: color,
              marginTop: -size * 0.12,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: size * 0.2,
              height: s,
              backgroundColor: color,
              marginLeft: size * 0.1,
            }}
          />
        </View>
      );

    case 'user':
      return (
        <View style={[styles.center, box, { gap: size * 0.08 }]} {...hidden}>
          <View
            style={{
              width: size * 0.38,
              height: size * 0.38,
              borderRadius: size,
              borderWidth: s,
              borderColor: color,
            }}
          />
          <View
            style={{
              width: size * 0.7,
              height: size * 0.3,
              borderWidth: s,
              borderBottomWidth: 0,
              borderColor: color,
              borderTopLeftRadius: size * 0.35,
              borderTopRightRadius: size * 0.35,
            }}
          />
        </View>
      );

    case 'home':
      return (
        <View style={[styles.center, box]} {...hidden}>
          <Triangle w={size * 0.86} h={size * 0.4} color={color} />
          <View
            style={{
              width: size * 0.56,
              height: size * 0.34,
              borderWidth: s,
              borderTopWidth: 0,
              borderColor: color,
            }}
          />
        </View>
      );

    case 'check':
      return (
        <View style={[styles.center, box]} {...hidden}>
          <View
            style={{
              width: size * 0.5,
              height: size * 0.26,
              borderLeftWidth: s,
              borderBottomWidth: s,
              borderColor: color,
              marginTop: -size * 0.08,
              transform: [{ rotate: '-45deg' }],
            }}
          />
        </View>
      );

    // An open ring with an arrowhead riding its top edge.
    case 'replay': {
      // A ring with its top-right quarter open, and the arrowhead sitting on
      // the end at twelve o'clock, pointing clockwise along the ring.
      //
      // The ring is drawn with its top side transparent and then turned 45°.
      // Unturned, a transparent side on a circle leaves ends cut on the
      // diagonal, which is what made the old mark look chipped; turned, both
      // ends fall on radii, so they are square to the stroke — and the gap
      // lands between twelve and three, where the arrow needs it.
      const d = size * 0.68;
      const ringTop = (size - d) / 2;
      const head = s * 2.8;
      return (
        <View style={box} {...hidden}>
          <View
            style={{
              position: 'absolute',
              top: ringTop,
              left: ringTop,
              width: d,
              height: d,
              borderRadius: d / 2,
              borderWidth: s,
              borderColor: color,
              borderTopColor: 'transparent',
              transform: [{ rotate: '45deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: ringTop + s / 2 - head / 2,
              left: size / 2 - s * 0.4,
              width: 0,
              height: 0,
              borderTopWidth: head / 2,
              borderBottomWidth: head / 2,
              borderLeftWidth: head * 0.8,
              borderTopColor: 'transparent',
              borderBottomColor: 'transparent',
              borderLeftColor: color,
            }}
          />
        </View>
      );
    }

    // The one mark drawn as type rather than geometry. A star's tapering
    // points can't be built from rectangles — every attempt reads as a plus
    // sign — and ★ (U+2605) is a monochrome text glyph that takes its colour
    // from the stylesheet like any letter, so it is typography, not an
    // emoji. Sort It Out already draws its suits the same way.
    case 'star':
      return (
        <View style={[styles.center, box]} {...hidden}>
          <Text style={{ fontSize: size, lineHeight: size * 1.16, color }} allowFontScaling={false}>
            ★
          </Text>
        </View>
      );

    case 'all':
      return (
        <View style={[styles.center, box]} {...hidden}>
          <View style={[styles.row, { gap: size * 0.12 }]}>
            <Dot d={size * 0.3} color={color} />
            <Dot d={size * 0.3} color={color} hollow stroke={s} />
          </View>
          <View style={[styles.row, { gap: size * 0.12, marginTop: size * 0.12 }]}>
            <Dot d={size * 0.3} color={color} hollow stroke={s} />
            <Dot d={size * 0.3} color={color} />
          </View>
        </View>
      );

    // Two overlapping cards — Find the Pairs.
    case 'pairs':
      return (
        <View style={[styles.center, box]} {...hidden}>
          <View
            style={{
              position: 'absolute',
              width: size * 0.44,
              height: size * 0.58,
              borderWidth: s,
              borderColor: color,
              left: size * 0.06,
              top: size * 0.1,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: size * 0.44,
              height: size * 0.58,
              borderWidth: s,
              borderColor: color,
              backgroundColor: palette.surface,
              right: size * 0.06,
              bottom: size * 0.1,
            }}
          />
        </View>
      );

    // Three counted marks — How Many?
    case 'count':
      return (
        <View style={[styles.center, box, { gap: size * 0.12 }]} {...hidden}>
          <View style={[styles.row, { gap: size * 0.12 }]}>
            <Dot d={size * 0.26} color={color} />
            <Dot d={size * 0.26} color={color} />
          </View>
          <Dot d={size * 0.26} color={color} />
        </View>
      );

    case 'shapes':
      return (
        <View style={[styles.center, box]} {...hidden}>
          <Triangle w={size * 0.78} h={size * 0.66} color={color} />
        </View>
      );

    // Stacked rules of text — Spell It!
    case 'letters':
      return (
        <View style={[styles.center, box, { gap: size * 0.14, alignItems: 'flex-start' }]} {...hidden}>
          <View style={{ width: size * 0.8, height: s, backgroundColor: color }} />
          <View style={{ width: size * 0.62, height: s, backgroundColor: color }} />
          <View style={{ width: size * 0.74, height: s, backgroundColor: color }} />
        </View>
      );

    // A nine-cell board — Sudoku.
    case 'grid':
      return (
        <View style={[styles.center, box]} {...hidden}>
          <View
            style={{
              width: size * 0.8,
              height: size * 0.8,
              borderWidth: s,
              borderColor: color,
              flexDirection: 'row',
              flexWrap: 'wrap',
            }}
          >
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={{
                  width: '50%',
                  height: '50%',
                  borderRightWidth: i % 2 === 0 ? s / 2 : 0,
                  borderBottomWidth: i < 2 ? s / 2 : 0,
                  borderColor: color,
                }}
              />
            ))}
          </View>
        </View>
      );

    // A run of marks with the next one still to come — Pattern Play.
    case 'pieces':
      // An L of three blocks with a gap between them — a piece, not a grid.
      return (
        <View style={[styles.center, box]} {...hidden}>
          <View style={{ width: size * 0.8, height: size * 0.8 }}>
            {[
              [0, 0],
              [1, 0],
              [1, 1],
            ].map(([row, col]) => (
              <View
                key={`${row}${col}`}
                style={{
                  position: 'absolute',
                  top: row * size * 0.42,
                  left: col * size * 0.42,
                  width: size * 0.36,
                  height: size * 0.36,
                  backgroundColor: color,
                }}
              />
            ))}
          </View>
        </View>
      );

    case 'memorygrid':
      // A three-by-three grid with two squares filled in.
      return (
        <View style={[styles.center, box]} {...hidden}>
          <View style={{ width: size * 0.78, flexDirection: 'row', flexWrap: 'wrap', gap: size * 0.06 }}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <View
                key={i}
                style={{
                  width: size * 0.22,
                  height: size * 0.22,
                  borderWidth: i === 1 || i === 6 ? 0 : s / 2,
                  borderColor: color,
                  backgroundColor: i === 1 || i === 6 ? color : 'transparent',
                }}
              />
            ))}
          </View>
        </View>
      );

    case 'shadow':
      // A hollow square and the edge of its shadow, cast down and to the right.
      return (
        <View style={box} {...hidden}>
          <View style={[at(size, 0.12, 0.12, 0.56, 0.56), { borderWidth: s, borderColor: color }]} />
          <View style={[at(size, 0.68, 0.3, 0.2, 0.58), { backgroundColor: color }]} />
          <View style={[at(size, 0.3, 0.68, 0.38, 0.2), { backgroundColor: color }]} />
        </View>
      );

    case 'cups':
      // Three cups, the middle one lifted off the ball under it.
      return (
        <View style={box} {...hidden}>
          <View style={[at(size, 0.06, 0.5, 0.24, 0.3), { backgroundColor: color }]} />
          <View style={[at(size, 0.38, 0.24, 0.24, 0.3), { backgroundColor: color }]} />
          <View style={[at(size, 0.7, 0.5, 0.24, 0.3), { backgroundColor: color }]} />
          <View style={[at(size, 0.44, 0.64, 0.12, 0.12), { borderRadius: size, backgroundColor: color }]} />
          <View style={[at(size, 0.04, 0.84, 0.92, 0), { height: s, backgroundColor: color }]} />
        </View>
      );

    case 'bigsmall':
      // Three blocks standing in a line, biggest first.
      return (
        <View style={box} {...hidden}>
          <View style={[at(size, 0.08, 0.3, 0.36, 0.52), { backgroundColor: color }]} />
          <View style={[at(size, 0.5, 0.48, 0.24, 0.34), { backgroundColor: color }]} />
          <View style={[at(size, 0.8, 0.64, 0.14, 0.18), { backgroundColor: color }]} />
          <View style={[at(size, 0.04, 0.82, 0.92, 0), { height: s, backgroundColor: color }]} />
        </View>
      );

    case 'slide':
      // Three tiles and a gap, in a two-by-two frame.
      return (
        <View style={box} {...hidden}>
          <View style={[at(size, 0.12, 0.12, 0.34, 0.34), { backgroundColor: color }]} />
          <View style={[at(size, 0.54, 0.12, 0.34, 0.34), { backgroundColor: color }]} />
          <View style={[at(size, 0.12, 0.54, 0.34, 0.34), { backgroundColor: color }]} />
          <View style={[at(size, 0.54, 0.54, 0.34, 0.34), { borderWidth: s / 2, borderColor: color }]} />
        </View>
      );

    case 'ladder':
      // Two rails and three rungs.
      return (
        <View style={box} {...hidden}>
          <View style={[at(size, 0.22, 0.08, 0, 0.84), { width: s, backgroundColor: color }]} />
          <View style={[at(size, 0.78, 0.08, 0, 0.84), { width: s, marginLeft: -s, backgroundColor: color }]} />
          {[0.24, 0.48, 0.72].map((top) => (
            <View key={top} style={[at(size, 0.22, top, 0.56, 0), { height: s, backgroundColor: color }]} />
          ))}
        </View>
      );

    case 'catch':
      // A basket, and a round thing falling into it.
      return (
        <View style={box} {...hidden}>
          <View style={[at(size, 0.38, 0.08, 0.24, 0.24), { borderRadius: size, backgroundColor: color }]} />
          <View style={[at(size, 0.14, 0.5, 0.72, 0.36), { borderWidth: s, borderTopWidth: 0, borderColor: color }]} />
          <View style={[at(size, 0.14, 0.66, 0.72, 0), { height: s, backgroundColor: color }]} />
        </View>
      );

    case 'maze':
      // Walls that turn in on themselves, and a way in.
      return (
        <View style={box} {...hidden}>
          <View style={[at(size, 0.1, 0.1, 0.8, 0.8), { borderWidth: s, borderColor: color, borderLeftWidth: 0 }]} />
          <View style={[at(size, 0.1, 0.1, 0, 0.5), { width: s, backgroundColor: color }]} />
          <View style={[at(size, 0.3, 0.3, 0.4, 0.4), { borderWidth: s, borderColor: color, borderRightWidth: 0 }]} />
          <View style={[at(size, 0.3, 0.1, 0, 0.2), { width: s, backgroundColor: color }]} />
        </View>
      );

    case 'balloons':
      // Two balloons on strings.
      return (
        <View style={box} {...hidden}>
          <View style={[at(size, 0.1, 0.1, 0.38, 0.44), { borderRadius: size, backgroundColor: color }]} />
          <View style={[at(size, 0.5, 0.2, 0.38, 0.44), { borderRadius: size, borderWidth: s, borderColor: color }]} />
          <View style={[at(size, 0.28, 0.54, 0, 0.38), { width: s / 2, backgroundColor: color }]} />
          <View style={[at(size, 0.68, 0.64, 0, 0.28), { width: s / 2, backgroundColor: color }]} />
        </View>
      );

    case 'treasure':
      // A chest: a lid over a box.
      return (
        <View style={box} {...hidden}>
          <View style={[at(size, 0.12, 0.2, 0.76, 0.22), { backgroundColor: color }]} />
          <View style={[at(size, 0.12, 0.46, 0.76, 0.36), { borderWidth: s, borderColor: color }]} />
          <View style={[at(size, 0.44, 0.38, 0.12, 0.2), { backgroundColor: color }]} />
        </View>
      );

    case 'pipes':
      // A pipe that comes in from the left and turns down.
      return (
        <View style={box} {...hidden}>
          <View style={[at(size, 0.06, 0.28, 0.58, 0.22), { backgroundColor: color }]} />
          <View style={[at(size, 0.42, 0.28, 0.22, 0.64), { backgroundColor: color }]} />
        </View>
      );

    case 'arcade':
      // A joystick: a base, a stick, and the knob on top.
      return (
        <View style={box} {...hidden}>
          <View style={[at(size, 0.14, 0.68, 0.72, 0.2), { backgroundColor: color }]} />
          <View style={[at(size, 0.5, 0.3, 0, 0.4), { width: s, marginLeft: -s / 2, backgroundColor: color }]} />
          <View style={[at(size, 0.34, 0.08, 0.32, 0.32), { borderRadius: size, backgroundColor: color }]} />
        </View>
      );

    case 'bricks':
      // A wall of bricks, a ball, and the paddle under it.
      return (
        <View style={box} {...hidden}>
          {[0.08, 0.38, 0.68].map((left) => (
            <View key={left} style={[at(size, left, 0.1, 0.24, 0.14), { backgroundColor: color }]} />
          ))}
          {[0.08, 0.68].map((left) => (
            <View key={left} style={[at(size, left, 0.3, 0.24, 0.14), { backgroundColor: color }]} />
          ))}
          <View style={[at(size, 0.42, 0.52, 0.16, 0.16), { borderRadius: size, backgroundColor: color }]} />
          <View style={[at(size, 0.28, 0.82, 0.44, 0), { height: s, backgroundColor: color }]} />
        </View>
      );

    case 'worm':
      // A worm that turns a corner, heading for an apple.
      return (
        <View style={box} {...hidden}>
          {[
            [0.08, 0.7],
            [0.28, 0.7],
            [0.48, 0.7],
            [0.48, 0.5],
          ].map(([left, top]) => (
            <View key={`${left}${top}`} style={[at(size, left, top, 0.18, 0.18), { backgroundColor: color }]} />
          ))}
          <View style={[at(size, 0.48, 0.3, 0.18, 0.18), { borderWidth: s / 2, borderColor: color }]} />
          <View style={[at(size, 0.72, 0.08, 0.2, 0.2), { borderRadius: size, backgroundColor: color }]} />
        </View>
      );

    case 'peekaboo':
      // A face peeking up out of a hole.
      return (
        <View style={box} {...hidden}>
          <View style={[at(size, 0.24, 0.24, 0.52, 0.5), { borderWidth: s, borderColor: color, borderBottomWidth: 0 }]} />
          <View style={[at(size, 0.36, 0.4, 0.1, 0.1), { backgroundColor: color }]} />
          <View style={[at(size, 0.54, 0.4, 0.1, 0.1), { backgroundColor: color }]} />
          <View style={[at(size, 0.06, 0.74, 0.88, 0.12), { backgroundColor: color }]} />
        </View>
      );

    case 'hoop':
      // A ball arcing towards a hoop on its board, seen side-on.
      return (
        <View style={box} {...hidden}>
          <View style={[at(size, 0.08, 0.1, 0.26, 0.26), { borderRadius: size, backgroundColor: color }]} />
          <View style={[at(size, 0.84, 0.16, 0, 0.5), { width: s, marginLeft: -s, backgroundColor: color }]} />
          <View style={[at(size, 0.4, 0.46, 0.44, 0), { height: s, backgroundColor: color }]} />
          <View style={[at(size, 0.46, 0.46, 0.32, 0.26), { borderLeftWidth: s / 2, borderRightWidth: s / 2, borderBottomWidth: s / 2, borderColor: color }]} />
        </View>
      );

    case 'lander':
      // A rocket on its legs, just down on the ground.
      return (
        <View style={box} {...hidden}>
          <Triangle w={size * 0.36} h={size * 0.2} color={color} style={{ position: 'absolute', left: size * 0.32, top: size * 0.06 }} />
          <View style={[at(size, 0.32, 0.26, 0.36, 0.34), { backgroundColor: color }]} />
          <View style={[at(size, 0.2, 0.6, 0.6, 0), { height: s, backgroundColor: color }]} />
          <View style={[at(size, 0.2, 0.6, 0, 0.26), { width: s, backgroundColor: color }]} />
          <View style={[at(size, 0.8, 0.6, 0, 0.26), { width: s, marginLeft: -s, backgroundColor: color }]} />
          <View style={[at(size, 0.04, 0.86, 0.92, 0), { height: s, backgroundColor: color }]} />
        </View>
      );

    case 'tower':
      // A tower of blocks, and the next one sliding in above it.
      return (
        <View style={box} {...hidden}>
          <View style={[at(size, 0.2, 0.74, 0.6, 0.16), { backgroundColor: color }]} />
          <View style={[at(size, 0.24, 0.54, 0.52, 0.16), { backgroundColor: color }]} />
          <View style={[at(size, 0.3, 0.34, 0.44, 0.16), { backgroundColor: color }]} />
          <View style={[at(size, 0.46, 0.1, 0.44, 0.16), { borderWidth: s / 2, borderColor: color }]} />
        </View>
      );

    case 'duck':
      // A duckling from above: a round body and a beak, crossing a lane line.
      return (
        <View style={box} {...hidden}>
          <View style={[at(size, 0.04, 0.46, 0.92, 0), { height: s / 2, backgroundColor: color }]} />
          <Triangle w={size * 0.2} h={size * 0.16} color={color} style={{ position: 'absolute', left: size * 0.4, top: size * 0.12 }} />
          <View style={[at(size, 0.28, 0.26, 0.44, 0.44), { borderRadius: size, backgroundColor: color }]} />
        </View>
      );

    case 'code':
      // Three slots, and the pegs that say how close the guess was.
      return (
        <View style={box} {...hidden}>
          {[0.06, 0.36, 0.66].map((left, i) => (
            <View key={left} style={[at(size, left, 0.14, 0.26, 0.26), i === 1 ? { backgroundColor: color } : { borderWidth: s / 2, borderColor: color }]} />
          ))}
          <View style={[at(size, 0.2, 0.62, 0.18, 0.18), { backgroundColor: color }]} />
          <View style={[at(size, 0.44, 0.62, 0.18, 0.18), { backgroundColor: color }]} />
          <View style={[at(size, 0.68, 0.62, 0.18, 0.18), { borderWidth: s / 2, borderColor: color }]} />
        </View>
      );

    case 'clockface':
      // A clock face with its quarter marks, at ten past ten.
      return (
        <View style={box} {...hidden}>
          <View style={[at(size, 0.06, 0.06, 0.88, 0.88), { borderRadius: size, borderWidth: s, borderColor: color }]} />
          <View style={[at(size, 0.48, 0.14, 0, 0.1), { width: s, marginLeft: -s / 2, backgroundColor: color }]} />
          <View style={[at(size, 0.48, 0.76, 0, 0.1), { width: s, marginLeft: -s / 2, backgroundColor: color }]} />
          <View style={[at(size, 0.14, 0.5, 0.1, 0), { height: s, marginTop: -s / 2, backgroundColor: color }]} />
          <View style={[at(size, 0.76, 0.5, 0.1, 0), { height: s, marginTop: -s / 2, backgroundColor: color }]} />
          <View style={[styles.center, at(size, 0, 0, 1, 1), { transform: [{ rotate: '-60deg' }] }]}>
            <View style={{ width: s * 1.5, height: size * 0.26, marginTop: -size * 0.26, backgroundColor: color }} />
          </View>
          <View style={[styles.center, at(size, 0, 0, 1, 1), { transform: [{ rotate: '60deg' }] }]}>
            <View style={{ width: s, height: size * 0.36, marginTop: -size * 0.36, backgroundColor: color }} />
          </View>
        </View>
      );

    case 'rhyme':
      // Two words that end the same: two rows, the same last two blocks.
      return (
        <View style={box} {...hidden}>
          <View style={[at(size, 0.06, 0.2, 0.22, 0.22), { borderWidth: s / 2, borderColor: color }]} />
          <View style={[at(size, 0.4, 0.2, 0.22, 0.22), { backgroundColor: color }]} />
          <View style={[at(size, 0.72, 0.2, 0.22, 0.22), { backgroundColor: color }]} />
          <View style={[at(size, 0.06, 0.58, 0.22, 0.22), { borderWidth: s / 2, borderColor: color, transform: [{ rotate: '45deg' }] }]} />
          <View style={[at(size, 0.4, 0.58, 0.22, 0.22), { backgroundColor: color }]} />
          <View style={[at(size, 0.72, 0.58, 0.22, 0.22), { backgroundColor: color }]} />
        </View>
      );

    case 'odd':
      // Three squares in a row and one circle: the one that doesn't belong.
      return (
        <View style={[styles.center, box]} {...hidden}>
          <View style={[styles.row, { gap: size * 0.08, alignItems: 'center' }]}>
            <View style={{ width: size * 0.2, height: size * 0.2, backgroundColor: color }} />
            <View style={{ width: size * 0.2, height: size * 0.2, backgroundColor: color }} />
            <Dot d={size * 0.24} color={color} hollow stroke={s} />
          </View>
        </View>
      );

    case 'race':
      // A car from above — a block with four wheels — beside a lane line.
      return (
        <View style={box} {...hidden}>
          <View
            style={{
              position: 'absolute',
              left: size * 0.28,
              top: size * 0.18,
              width: size * 0.3,
              height: size * 0.5,
              backgroundColor: color,
            }}
          />
          {[0.22, 0.54].map((top) =>
            [0.18, 0.58].map((left) => (
              <View
                key={`${top}${left}`}
                style={{
                  position: 'absolute',
                  top: size * top,
                  left: size * left,
                  width: size * 0.1,
                  height: size * 0.14,
                  backgroundColor: color,
                }}
              />
            )),
          )}
          {[0.12, 0.44, 0.76].map((top) => (
            <View
              key={top}
              style={{ position: 'absolute', left: size * 0.8, top: size * top, width: s, height: size * 0.16, backgroundColor: color }}
            />
          ))}
        </View>
      );

    case 'hop':
      // A block in mid-hop over a smaller one, above a ground line.
      return (
        <View style={box} {...hidden}>
          <View
            style={{
              position: 'absolute',
              left: size * 0.12,
              top: size * 0.14,
              width: size * 0.34,
              height: size * 0.34,
              backgroundColor: color,
            }}
          />
          <View
            style={{
              position: 'absolute',
              right: size * 0.14,
              bottom: size * 0.16 + s,
              width: size * 0.2,
              height: size * 0.2,
              backgroundColor: color,
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: size * 0.08,
              right: size * 0.08,
              bottom: size * 0.16,
              height: s,
              backgroundColor: color,
            }}
          />
        </View>
      );

    case 'sequence':
      return (
        <View style={[styles.center, box]} {...hidden}>
          <View style={[styles.row, { gap: size * 0.1, alignItems: 'center' }]}>
            <Dot d={size * 0.22} color={color} />
            <Dot d={size * 0.3} color={color} />
            <Dot d={size * 0.38} color={color} />
            <Dot d={size * 0.24} color={color} hollow stroke={s} />
          </View>
        </View>
      );
  }
}

/** Shared props: icons always sit next to a real label, so they are never
 *  announced on their own. */
const hidden = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no' as const,
};

function Bar({
  w,
  h,
  color,
  rotate,
  absolute,
}: {
  readonly w: number;
  readonly h: number;
  readonly color: string;
  readonly rotate: string;
  readonly absolute?: boolean;
}) {
  return (
    <View
      style={[
        { width: w, height: h, backgroundColor: color, transform: [{ rotate }] },
        absolute ? { position: 'absolute' } : null,
      ]}
    />
  );
}

function Triangle({
  w,
  h,
  color,
  style,
}: {
  readonly w: number;
  readonly h: number;
  readonly color: string;
  readonly style?: object;
}) {
  return (
    <View
      style={[
        {
          width: 0,
          height: 0,
          borderLeftWidth: w / 2,
          borderRightWidth: w / 2,
          borderBottomWidth: h,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: color,
        },
        style,
      ]}
    />
  );
}

function Dot({
  d,
  color,
  hollow,
  stroke,
}: {
  readonly d: number;
  readonly color: string;
  readonly hollow?: boolean;
  readonly stroke?: number;
}) {
  return (
    <View
      style={{
        width: d,
        height: d,
        borderRadius: d,
        backgroundColor: hollow ? 'transparent' : color,
        borderWidth: hollow ? stroke ?? 2 : 0,
        borderColor: color,
      }}
    />
  );
}

/** An absolutely placed box, in fractions of the icon's size. */
function at(size: number, left: number, top: number, width: number, height: number) {
  return {
    position: 'absolute' as const,
    left: size * left,
    top: size * top,
    width: size * width,
    height: size * height,
  };
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
});
