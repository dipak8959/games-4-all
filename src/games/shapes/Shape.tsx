import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { palette } from '../../theme/tokens';
import type { ColorKind, ShapeKind } from './logic';

/**
 * Draws one sortable shape without an SVG dependency: plain Views for circle
 * and square, a CSS-triangle border trick for the triangle, and a glyph for the
 * star.
 */

export const SHAPE_COLORS: Record<ColorKind, string> = {
  berry: palette.berry,
  sky: palette.sky,
  leaf: palette.leaf,
  sun: palette.sun,
};

export const SHAPE_NAMES: Record<ShapeKind, string> = {
  circle: 'circle',
  square: 'square',
  triangle: 'triangle',
  star: 'star',
};

export const COLOR_NAMES: Record<ColorKind, string> = {
  berry: 'orange',
  sky: 'blue',
  leaf: 'green',
  sun: 'yellow',
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

  if (shape === 'circle') {
    return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: fill }} />;
  }

  if (shape === 'square') {
    return <View style={{ width: size, height: size, borderRadius: size * 0.14, backgroundColor: fill }} />;
  }

  if (shape === 'triangle') {
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
  }

  return <Text style={[styles.star, { fontSize: size * 1.15, color: fill }]}>★</Text>;
}

/** Screen-reader description. Always names both properties so the shape is
 *  identifiable without seeing colour. */
export function describe(shape: ShapeKind, color: ColorKind): string {
  return `${COLOR_NAMES[color]} ${SHAPE_NAMES[shape]}`;
}

const styles = StyleSheet.create({
  star: { textAlign: 'center', includeFontPadding: false },
});
