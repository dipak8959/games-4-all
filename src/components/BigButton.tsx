import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { font, hitTarget, palette, radius, shadow, space } from '../theme/tokens';

type Props = {
  readonly label: string;
  readonly icon?: string;
  readonly onPress: () => void;
  readonly color?: string;
  readonly tone?: 'solid' | 'quiet';
  readonly disabled?: boolean;
  readonly style?: ViewStyle;
  /** Spoken by a screen reader in place of the visible label when they differ. */
  readonly accessibilityLabel?: string;
};

/**
 * The app's only button.
 *
 * Every instance is at least `hitTarget` tall, carries a visible label, and
 * grows its own press feedback — small children press imprecisely and need to
 * see that something happened.
 */
export function BigButton({
  label,
  icon,
  onPress,
  color = palette.sky,
  tone = 'solid',
  disabled = false,
  style,
  accessibilityLabel,
}: Props) {
  const solid = tone === 'solid';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        solid ? { backgroundColor: color } : styles.quiet,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <View style={styles.row}>
        {icon ? <Text style={styles.icon}>{icon}</Text> : null}
        <Text style={[styles.label, solid ? styles.labelSolid : { color: palette.ink }]}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: hitTarget,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.lg,
    ...shadow,
  },
  quiet: {
    backgroundColor: palette.surface,
    borderWidth: 2,
    borderColor: palette.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  icon: { fontSize: font.label },
  label: { fontSize: font.label, fontWeight: '700', textAlign: 'center' },
  labelSolid: { color: '#FFFFFF' },
  pressed: { transform: [{ scale: 0.96 }], opacity: 0.9 },
  disabled: { opacity: 0.4 },
});
