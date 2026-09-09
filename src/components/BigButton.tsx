import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Icon, type IconName } from './Icon';
import { font, hitTarget, palette, rule, space, tracking } from '../theme/tokens';
import { monoFamily } from '../theme/type';

type Props = {
  readonly label: string;
  readonly icon?: IconName;
  readonly onPress: () => void;
  readonly tone?: 'solid' | 'quiet';
  readonly disabled?: boolean;
  /** Machine-type second line under the label, e.g. `OPENS INSTANTLY`. */
  readonly note?: string;
  /** Draws a chevron at the right edge — for an action that goes somewhere. */
  readonly chevron?: boolean;
  readonly style?: ViewStyle;
  /** Spoken by a screen reader in place of the visible label when they differ. */
  readonly accessibilityLabel?: string;
};

/**
 * The app's only button.
 *
 * Modernist: a square block, flush-left label, accent fill for the primary
 * action and a 2px ink outline for everything else. No radius, no shadow,
 * no gradient.
 *
 * Its height is the one place this deliberately overshoots the handoff —
 * 72dp rather than the handoff's ~52px CTA — because small hands press
 * imprecisely and `hitTarget` is the app's floor everywhere (see SAFETY.md).
 */
export function BigButton({
  label,
  icon,
  onPress,
  tone = 'solid',
  disabled = false,
  note,
  chevron = false,
  style,
  accessibilityLabel,
}: Props) {
  const solid = tone === 'solid';
  const ink = solid ? palette.bg : palette.ink;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        solid ? styles.solid : styles.quiet,
        pressed && !disabled && (solid ? styles.solidPressed : styles.quietPressed),
        disabled && styles.disabled,
        style,
      ]}
    >
      <View style={styles.row}>
        {icon ? <Icon name={icon} size={20} color={ink} /> : null}
        <View style={styles.text}>
          <Text style={[styles.label, { color: ink }]}>{label}</Text>
          {note ? <Text style={[styles.note, { color: ink }]}>{note}</Text> : null}
        </View>
        {chevron ? <Icon name="chevron" size={18} color={ink} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: hitTarget,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
  },
  solid: { backgroundColor: palette.accent },
  solidPressed: { backgroundColor: palette.accentPressed },
  quiet: { borderWidth: rule.major, borderColor: palette.ink, backgroundColor: 'transparent' },
  quietPressed: { backgroundColor: 'rgba(32,30,29,0.10)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  text: { flex: 1, gap: 2 },
  label: { fontSize: font.h5, fontWeight: '800' },
  note: {
    fontFamily: monoFamily,
    fontSize: font.mono,
    letterSpacing: tracking.mono,
    textTransform: 'uppercase',
    opacity: 0.85,
  },
  disabled: { opacity: 0.45 },
});
