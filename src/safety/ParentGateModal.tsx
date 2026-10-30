import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BigButton } from '../components/BigButton';
import { Icon } from '../components/Icon';
import { Rule } from '../components/Rule';
import { font, hitTarget, palette, rule, space } from '../theme/tokens';
import { fonts, type } from '../theme/type';
import { systemRng } from '../util/random';
import { answerLength, createChallenge, isCorrect } from './parentGate';

/**
 * The gate a grown-up passes to reach Parent Zone.
 *
 * The answer is typed on a number pad, not picked from a list: a list can be
 * guessed, a three-digit answer can't, and a wrong one brings a new question.
 * It checks itself once all three digits are in.
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
  const [typed, setTyped] = useState('');
  const challenge = useMemo(() => createChallenge(systemRng), [nonce]);
  const length = answerLength(challenge);

  // A fresh question, and nothing typed, each time the gate opens.
  useEffect(() => {
    if (!visible) return;
    setTyped('');
    setWrong(false);
    setNonce((n) => n + 1);
  }, [visible]);

  const press = useCallback(
    (digit: string) => {
      const next = (typed + digit).slice(0, length);
      if (next.length < length) {
        setTyped(next);
        return;
      }
      if (isCorrect(challenge, Number(next))) {
        setTyped('');
        setWrong(false);
        onPass();
        return;
      }
      setTyped('');
      setWrong(true);
      setNonce((n) => n + 1);
    },
    [typed, length, challenge, onPass],
  );
  const erase = useCallback(() => setTyped((t) => t.slice(0, -1)), []);

  const key = (label: string, onPress: () => void, child: React.ReactNode, testID: string) => (
    <Pressable
      key={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
    >
      {child}
    </Pressable>
  );
  const digitKey = (d: string) => key(d, () => press(d), <Text style={styles.keyText}>{d}</Text>, `gate-key-${d}`);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      {/* Scrolls rather than spill off the smallest phones. */}
      <ScrollView style={styles.overlay} contentContainerStyle={styles.overlayInner}>
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
            <Text style={[type.meta, styles.hint]}>Type the answer to continue.</Text>
          </View>

          <View style={styles.answer} accessible accessibilityLabel={typed ? `Typed ${typed.split('').join(' ')}` : 'Nothing typed yet'}>
            {Array.from({ length }, (_, i) => (
              <View key={i} style={[styles.slot, i === typed.length && styles.slotNext]}>
                <Text style={styles.keyText}>{typed[i] ?? ''}</Text>
              </View>
            ))}
          </View>

          {wrong ? (
            <Text style={[type.secondary, styles.wrong]} accessibilityLiveRegion="polite">
              Not quite — here is a new one.
            </Text>
          ) : null}

          <View style={styles.pad}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digitKey)}
            <View style={styles.keySpacer} />
            {digitKey('0')}
            {key('Delete', erase, <Icon name="back" size={24} color={palette.ink} />, 'gate-key-delete')}
          </View>

          <BigButton label="Cancel" onPress={onCancel} tone="quiet" />
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(32,30,29,0.55)' },
  overlayInner: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: space.md },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: palette.bg,
    borderWidth: rule.major,
    borderColor: palette.ink,
    padding: space.md,
    gap: space.sm,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  prompt: { gap: space.xs },
  hint: {},
  wrong: { color: palette.accentText },
  answer: { flexDirection: 'row', gap: space.sm },
  // Shows what's typed; not tapped, so it needn't be a full target.
  slot: {
    width: hitTarget * 0.75,
    height: hitTarget * 0.75,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: rule.major,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  slotNext: { borderColor: palette.ink },
  pad: { flexDirection: 'row', flexWrap: 'wrap', gap: rule.hair },
  key: {
    width: '32.5%',
    minHeight: hitTarget,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderWidth: rule.hair,
    borderColor: palette.border,
  },
  keySpacer: { width: '32.5%', flexGrow: 1 },
  keyPressed: { backgroundColor: palette.accent },
  keyText: { fontFamily: fonts.heavy, fontSize: font.h3, color: palette.ink },
});
