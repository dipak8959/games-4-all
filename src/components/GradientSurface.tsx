import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * The app's one gradient fill.
 *
 * Every "candy" surface — buttons, game tiles, the round-complete card —
 * uses the same top-left-to-bottom-right diagonal, so the whole app reads as
 * one light source rather than a grab-bag of effects.
 */
export function GradientSurface({
  colors,
  style,
  children,
}: {
  readonly colors: readonly [string, string];
  readonly style?: StyleProp<ViewStyle>;
  readonly children?: React.ReactNode;
}) {
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={style}
    >
      {children}
    </LinearGradient>
  );
}
