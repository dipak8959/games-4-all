import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { BigButton } from './BigButton';
import { palette, rule, space } from '../theme/tokens';
import { type } from '../theme/type';

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
  onConfirm,
  onCancel,
}: {
  readonly visible: boolean;
  readonly title: string;
  readonly body: string;
  readonly confirmLabel: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={type.h3} accessibilityRole="header">
            {title}
          </Text>
          <Text style={[type.body, styles.body]}>{body}</Text>

          <BigButton label={confirmLabel} onPress={onConfirm} />
          <BigButton label="Cancel" onPress={onCancel} tone="quiet" style={styles.gap} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(32,30,29,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: palette.bg,
    borderWidth: rule.major,
    borderColor: palette.ink,
    padding: space.lg,
  },
  body: { color: palette.inkSoft, marginTop: space.sm, marginBottom: space.lg },
  gap: { marginTop: space.sm },
});
