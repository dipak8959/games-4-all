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
  // One distinct mark per game, and the "all categories" mark
  | 'all'
  | 'pairs'
  | 'count'
  | 'shapes'
  | 'letters'
  | 'grid'
  | 'sequence'
  | 'math';

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
    case 'replay':
      return (
        <View style={[styles.center, box]} {...hidden}>
          <View
            style={{
              width: size * 0.72,
              height: size * 0.72,
              borderRadius: size,
              borderWidth: s,
              borderColor: color,
              borderTopColor: 'transparent',
            }}
          />
          <Triangle
            w={size * 0.26}
            h={size * 0.22}
            color={color}
            style={{ position: 'absolute', top: 0, right: size * 0.06 }}
          />
        </View>
      );

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

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
});
