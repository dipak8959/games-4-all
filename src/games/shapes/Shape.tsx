import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { palette } from '../../theme/tokens';
import type { ColorKind, ShapeKind } from './logic';

/**
 * Draws one sortable shape without an SVG dependency: plain Views for circle,
 * square, and diamond (a rotated square), a CSS-triangle border trick for the
 * triangle, and a filled glyph for star and heart.
 */

export const SHAPE_COLORS: Record<ColorKind, string> = {
  berry: palette.berry,
  sky: palette.sky,
  leaf: palette.leaf,
  sun: palette.sun,
  grape: palette.grape,
};

export const SHAPE_NAMES: Record<ShapeKind, string> = {
  circle: 'circle',
  square: 'square',
  triangle: 'triangle',
  star: 'star',
  diamond: 'diamond',
  heart: 'heart',
};

export const COLOR_NAMES: Record<ColorKind, string> = {
  berry: 'orange',
  sky: 'blue',
  leaf: 'green',
  sun: 'yellow',
  grape: 'pink',
};

export function Shape({
  shape,
  color,
  size,
}: {
  readonly shape: ShapeKind;
  readonly color: ColorKind;
  readonly size: number;
}) {
  const fill = SHAPE_COLORS[color];

  switch (shape) {
    case 'circle':
      return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: fill }} />;

    case 'square':
      return <View style={{ width: size, height: size, borderRadius: size * 0.14, backgroundColor: fill }} />;

    case 'diamond': {
      // A square rotated 45°, sized so its diagonal matches the other shapes'
      // bounding box rather than its edge — otherwise a diamond reads as
      // noticeably bigger than a same-`size` circle or square.
      const edge = size * 0.72;
      return (
        <View
          style={{
            width: edge,
            height: edge,
            borderRadius: edge * 0.14,
            backgroundColor: fill,
            transform: [{ rotate: '45deg' }],
          }}
        />
      );
    }

    case 'triangle':
      return (
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: size / 2,
            borderRightWidth: size / 2,
            borderBottomWidth: size * 0.87,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: fill,
            borderStyle: 'solid',
            backgroundColor: 'transparent',
          }}
        />
      );

    case 'star':
      return <Text style={[styles.glyph, { fontSize: size * 1.15, color: fill }]}>★</Text>;

    case 'heart':
      return <Text style={[styles.glyph, { fontSize: size * 1.05, color: fill }]}>♥</Text>;
  }
}

/** Screen-reader description. Always names both properties so the shape is
 *  identifiable without seeing colour. */
export function describe(shape: ShapeKind, color: ColorKind): string {
  return `${COLOR_NAMES[color]} ${SHAPE_NAMES[shape]}`;
}

const styles = StyleSheet.create({
  glyph: { textAlign: 'center', includeFontPadding: false },
});
