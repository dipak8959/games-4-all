import React from 'react';
import { View, type ViewStyle } from 'react-native';

import { palette, rule } from '../theme/tokens';

/**
 * A horizontal rule.
 *
 * This is how the layout is held together: there are no cards, no shadows
 * and no rounded containers anywhere in the interface, so a 2px rule
 * divides one major section from the next and a 1px rule divides rows
 * inside one.
 */
export function Rule({
  weight = 'hair',
  style,
}: {
  readonly weight?: 'major' | 'hair';
  readonly style?: ViewStyle;
}) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[{ height: rule[weight], backgroundColor: palette.border }, style]}
    />
  );
}
