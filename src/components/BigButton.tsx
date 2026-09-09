import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { GradientSurface } from './GradientSurface';
import { Icon, type IconName } from './Icon';
import { font, gradientForColor, hitTarget, palette, radius, shadow, space } from '../theme/tokens';

type Props = {
  readonly label: string;
  readonly icon?: IconName;
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
 *
 * Shadow lives on the outer `Pressable` and the gradient fill on an inner,
 * clipped `View`: combining a shadow with `overflow: hidden` on the same
 * layer clips the shadow itself on iOS, so the two are kept apart.
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
        styles.outer,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <View style={[styles.inner, solid ? undefined : styles.quiet]}>
        {solid ? <GradientSurface colors={gradientForColor(color)} style={StyleSheet.absoluteFill} /> : null}
        <View style={styles.row}>
          {icon ? <Icon name={icon} size={font.label} color={solid ? '#FFFFFF' : palette.ink} /> : null}
          <Text style={[styles.label, solid ? styles.labelSolid : { color: palette.ink }]}>
            {label}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    minHeight: hitTarget,
    borderRadius: radius.lg,
    ...shadow,
  },
  inner: {
    flex: 1,
    minHeight: hitTarget,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  quiet: {
    backgroundColor: palette.surface,
    borderWidth: 2,
    borderColor: palette.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  icon: { fontSize: font.label },
  label: { fontSize: font.label, fontWeight: '800', textAlign: 'center' },
  labelSolid: { color: '#FFFFFF' },
  pressed: { transform: [{ scale: 0.96 }], opacity: 0.92 },
  disabled: { opacity: 0.4 },
});
