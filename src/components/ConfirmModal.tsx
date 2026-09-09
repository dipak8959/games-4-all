import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { BigButton } from './BigButton';
import { font, palette, radius, shadowFloating, space } from '../theme/tokens';

/**
 * A yes/no confirmation, styled to match the rest of the app.
 *
 * Not `Alert.alert`: react-native-web ships that as a literal no-op
 * (`static alert() {}`), so a confirmation gated behind it silently does
 * nothing in a browser — no dialog, no callback, no feedback. `Modal`, unlike
 * `Alert`, is properly implemented on web, so building the confirmation out
 * of it (the same way `ParentGateModal` does) works identically on iOS,
 * Android, and web.
 */
export function ConfirmModal({
  visible,
  title,
  body,
  confirmLabel,
  confirmColor,
  onConfirm,
  onCancel,
}: {
  readonly visible: boolean;
  readonly title: string;
  readonly body: string;
  readonly confirmLabel: string;
  readonly confirmColor: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <Text style={styles.body}>{body}</Text>

          <BigButton label={confirmLabel} color={confirmColor} onPress={onConfirm} style={styles.gap} />
          <BigButton label="Cancel" onPress={onCancel} tone="quiet" style={styles.gap} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(42, 33, 24, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    padding: space.lg,
    ...shadowFloating,
  },
  title: { fontSize: font.title - 4, fontWeight: '800', color: palette.ink, textAlign: 'center' },
  body: {
    fontSize: font.body,
    color: palette.inkSoft,
    textAlign: 'center',
    marginTop: space.sm,
    marginBottom: space.lg,
  },
  gap: { marginTop: space.sm },
});
