import React, { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { BigButton } from '../components/BigButton';
import { Icon } from '../components/Icon';
import { Rule } from '../components/Rule';
import { font, hitTarget, palette, rule, space } from '../theme/tokens';
import { type } from '../theme/type';
import { systemRng } from '../util/random';
import { createChallenge, isCorrect } from './parentGate';

/**
 * The gate a grown-up passes to reach Parent Zone.
 *
 * A wrong answer re-rolls the question rather than allowing repeated guesses at
 * the same one, which is what makes trial-and-error impractical for a child.
 *
 * The handoff calls for a PIN here instead. A PIN would be a real secret to
 * store, forget, and reset, and this gate deliberately guards nothing whose
 * disclosure would matter — see "Parent gate" in SAFETY.md. The question
 * stays; the chrome around it is the handoff's.
 */
export function ParentGateModal({
  visible,
  onPass,
  onCancel,
}: {
  readonly visible: boolean;
  readonly onPass: () => void;
  readonly onCancel: () => void;
}) {
  const [nonce, setNonce] = useState(0);
  const [wrong, setWrong] = useState(false);
  const challenge = useMemo(() => createChallenge(systemRng), [nonce]);

  const choose = useCallback(
    (choice: number) => {
      if (isCorrect(challenge, choice)) {
        setWrong(false);
        onPass();
        return;
      }
      setWrong(true);
      setNonce((n) => n + 1);
    },
    [challenge, onPass],
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Icon name="lock" size={18} color={palette.ink} />
            <Text style={type.mono}>GROWN-UPS ONLY</Text>
          </View>
          <Rule weight="major" />

          <View style={styles.prompt}>
            <Text style={type.h2} accessibilityLabel={`What is ${challenge.prompt}?`}>
              {challenge.prompt}
            </Text>
            <Text style={[type.meta, styles.hint]}>Answer to continue.</Text>
          </View>

          {wrong ? (
            <Text style={[type.secondary, styles.wrong]} accessibilityLiveRegion="polite">
              Not quite — here is a new one.
            </Text>
          ) : null}

          <View style={styles.choices}>
            {challenge.choices.map((choice) => (
              <Pressable
                key={choice}
                accessibilityRole="button"
                accessibilityLabel={`${choice}`}
                onPress={() => choose(choice)}
                style={({ pressed }) => [styles.choice, pressed && styles.choicePressed]}
              >
                <Text style={styles.choiceText}>{choice}</Text>
              </Pressable>
            ))}
          </View>

          <BigButton label="Cancel" onPress={onCancel} tone="quiet" />
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
    gap: space.md,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  prompt: { gap: space.xs },
  hint: {},
  wrong: { color: palette.accentText },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: rule.hair },
  choice: {
    minWidth: hitTarget + 16,
    minHeight: hitTarget,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    backgroundColor: palette.surface,
    borderWidth: rule.hair,
    borderColor: palette.border,
  },
  choicePressed: { backgroundColor: palette.accent },
  choiceText: { fontSize: font.h3, fontWeight: '800', color: palette.ink },
});
