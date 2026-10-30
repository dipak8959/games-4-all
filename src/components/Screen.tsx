import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { gutter, palette, space } from '../theme/tokens';

/**
 * Page frame: safe-area aware, on the ground colour, with the handoff's
 * 16px gutter.
 *
 * `padded={false}` is for screens that run rules and fills edge to edge and
 * apply the gutter themselves, section by section — Home in particular.
 */
export function Screen({
  children,
  style,
  padded = true,
}: {
  readonly children: React.ReactNode;
  readonly style?: ViewStyle;
  readonly padded?: boolean;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <View style={[padded ? styles.padded : styles.bare, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  padded: { flex: 1, paddingHorizontal: gutter, paddingVertical: space.sm },
  bare: { flex: 1 },
});
