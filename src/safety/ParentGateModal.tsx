import React, { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { BigButton } from '../components/BigButton';
import { GradientSurface } from '../components/GradientSurface';
import { font, gradients, hitTarget, palette, radius, shadow, shadowFloating, space } from '../theme/tokens';
import { systemRng } from '../util/random';
import { createChallenge, isCorrect } from './parentGate';

/**
 * The gate a grown-up passes to reach Parent Zone.
 *
 * A wrong answer re-rolls the question rather than allowing repeated guesses at
 * the same one, which is what makes trial-and-error impractical for a child.
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
          <Text style={styles.title} accessibilityRole="header">
            🔒 Grown-ups only
          </Text>
          <Text style={styles.body}>Answer to continue.</Text>

          <Text style={styles.prompt} accessibilityLabel={`What is ${challenge.prompt}?`}>
            {challenge.prompt}
          </Text>

          {wrong ? (
            <Text style={styles.wrong} accessibilityLiveRegion="polite">
              🤔 Not quite — here is a new one.
            </Text>
          ) : null}

          <View style={styles.choices}>
            {challenge.choices.map((choice) => (
              <Pressable
                key={choice}
                accessibilityRole="button"
                accessibilityLabel={`${choice}`}
                onPress={() => choose(choice)}
                style={({ pressed }) => [styles.choiceOuter, pressed && styles.pressed]}
              >
                <GradientSurface colors={gradients.deep} style={styles.choice}>
                  <Text style={styles.choiceText}>{choice}</Text>
                </GradientSurface>
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
  title: { fontSize: font.title, fontWeight: '800', color: palette.ink, textAlign: 'center' },
  body: { fontSize: font.body, color: palette.inkSoft, textAlign: 'center', marginTop: space.xs },
  prompt: {
    fontSize: font.hero - 8,
    fontWeight: '800',
    color: palette.ink,
    textAlign: 'center',
    marginVertical: space.md,
  },
  wrong: { fontSize: font.body, color: palette.warn, textAlign: 'center', marginBottom: space.sm },
  choices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: space.sm,
    marginBottom: space.md,
  },
  choiceOuter: { borderRadius: radius.md, ...shadow },
  pressed: { transform: [{ scale: 0.95 }], opacity: 0.92 },
  choice: {
    minWidth: hitTarget + 24,
    minHeight: hitTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.md,
  },
  choiceText: { fontSize: font.title, fontWeight: '800', color: '#FFFFFF' },
});
