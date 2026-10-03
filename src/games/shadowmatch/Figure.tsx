import React from 'react';
import { View } from 'react-native';

import type { Figure, Part } from './figures';

/**
 * Draws a Shadow Match figure from its parts, filling a `size` square: in a
 * play colour for the thing itself, in ink for its shadow. Plain views, the
 * same as every other drawing in the app — the triangle is the border trick
 * Sort It Out uses, the disc a view with its corners taken all the way in.
 */
export function FigureView({
  figure,
  size,
  color,
  turn = 0,
}: {
  readonly figure: Figure;
  readonly size: number;
  readonly color: string;
  readonly turn?: number;
}) {
  const u = size / 100;
  return (
    <View style={{ width: size, height: size, transform: [{ rotate: `${turn}deg` }] }}>
      {figure.parts.map((part, i) => (
        <PartView key={i} part={part} u={u} color={color} />
      ))}
    </View>
  );
}

function PartView({ part, u, color }: { readonly part: Part; readonly u: number; readonly color: string }) {
  switch (part.k) {
    case 'rect':
      return (
        <View
          style={{
            position: 'absolute',
            left: part.x * u,
            top: part.y * u,
            width: part.w * u,
            height: part.h * u,
            backgroundColor: color,
          }}
        />
      );
    case 'disc':
      return (
        <View
          style={{
            position: 'absolute',
            left: (part.cx - part.r) * u,
            top: (part.cy - part.r) * u,
            width: part.r * 2 * u,
            height: part.r * 2 * u,
            borderRadius: part.r * u,
            backgroundColor: color,
          }}
        />
      );
    case 'tri': {
      const w = part.w * u;
      const h = part.h * u;
      const base = { position: 'absolute' as const, left: part.x * u, top: part.y * u, width: 0, height: 0 };
      const clear = 'transparent';
      switch (part.dir) {
        case 'up':
          return (
            <View
              style={[
                base,
                {
                  borderLeftWidth: w / 2,
                  borderRightWidth: w / 2,
                  borderBottomWidth: h,
                  borderLeftColor: clear,
                  borderRightColor: clear,
                  borderBottomColor: color,
                },
              ]}
            />
          );
        case 'down':
          return (
            <View
              style={[
                base,
                {
                  borderLeftWidth: w / 2,
                  borderRightWidth: w / 2,
                  borderTopWidth: h,
                  borderLeftColor: clear,
                  borderRightColor: clear,
                  borderTopColor: color,
                },
              ]}
            />
          );
        case 'right':
          return (
            <View
              style={[
                base,
                {
                  borderTopWidth: h / 2,
                  borderBottomWidth: h / 2,
                  borderLeftWidth: w,
                  borderTopColor: clear,
                  borderBottomColor: clear,
                  borderLeftColor: color,
                },
              ]}
            />
          );
        case 'left':
          return (
            <View
              style={[
                base,
                {
                  borderTopWidth: h / 2,
                  borderBottomWidth: h / 2,
                  borderRightWidth: w,
                  borderTopColor: clear,
                  borderBottomColor: clear,
                  borderRightColor: color,
                },
              ]}
            />
          );
      }
    }
  }
}
