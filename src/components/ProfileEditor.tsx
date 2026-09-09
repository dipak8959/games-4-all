import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BigButton } from './BigButton';
import { AVATAR_CHOICES, clampAge, monogramFor, NAME_CHOICES, type ProfileInput } from '../state/profiles';
import { font, hitTarget, palette, playColor, rule, space } from '../theme/tokens';
import { type } from '../theme/type';

/**
 * The form behind both "create your first profile" (`OnboardingScreen`) and
 * "add a profile" (`ProfilesScreen`) — kept as one component so the two
 * flows can never drift into asking for a name, avatar, and age two
 * different ways.
 *
 * No text input anywhere: a name is picked from a small fixed list, a
 * colour from the palette, and age from a stepper. That keeps the "collect
 * nothing" promise literal for this screen — there is no keyboard involved,
 * so there is nothing typed to even consider sensitive.
 */
export function ProfileEditor({
  initial,
  onSave,
  onCancel,
  saveLabel = 'Save',
}: {
  readonly initial?: Partial<ProfileInput>;
  readonly onSave: (input: ProfileInput) => void;
  readonly onCancel?: () => void;
  readonly saveLabel?: string;
}) {
  const [name, setName] = useState(initial?.name ?? NAME_CHOICES[0]);
  const [avatar, setAvatar] = useState(initial?.avatar ?? AVATAR_CHOICES[0]);
  const [age, setAge] = useState(initial?.age ?? 6);

  return (
    <View style={styles.root}>
      <Text style={type.mono}>PICK A COLOUR</Text>
      <View style={styles.swatches}>
        {AVATAR_CHOICES.map((choice) => (
          <Pressable
            key={choice}
            accessibilityRole="radio"
            accessibilityLabel={`${choice} colour`}
            accessibilityState={{ selected: avatar === choice }}
            onPress={() => setAvatar(choice)}
            style={[styles.swatch, { backgroundColor: playColor(choice) }, avatar === choice && styles.selectedEdge]}
          >
            <Text style={styles.swatchLetter}>{monogramFor(name)}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[type.mono, styles.label]}>PICK A NAME</Text>
      <View style={styles.chips}>
        {NAME_CHOICES.map((choice) => (
          <Pressable
            key={choice}
            accessibilityRole="radio"
            accessibilityLabel={choice}
            accessibilityState={{ selected: name === choice }}
            onPress={() => setName(choice)}
            style={[styles.chip, name === choice && styles.chipSelected]}
          >
            <Text style={[type.h5, name === choice && styles.textOnAccent]}>{choice}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[type.mono, styles.label]}>HOW OLD?</Text>
      <View style={styles.stepper}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Younger"
          onPress={() => setAge((a) => clampAge(a - 1))}
          style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}
        >
          <Text style={styles.stepButtonText}>−</Text>
        </Pressable>
        <Text style={styles.ageValue} accessibilityLabel={`${age} years old`}>
          {age}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Older"
          onPress={() => setAge((a) => clampAge(a + 1))}
          style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}
        >
          <Text style={styles.stepButtonText}>+</Text>
        </Pressable>
      </View>

      <BigButton
        label={saveLabel}
        icon="check"
        onPress={() => onSave({ name, avatar, age: clampAge(age) })}
        style={styles.gap}
      />
      {onCancel ? <BigButton label="Cancel" tone="quiet" onPress={onCancel} style={styles.gap} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.sm },
  label: { marginTop: space.md },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: rule.hair },
  swatch: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  swatchLetter: { fontSize: 22, fontWeight: '800', color: palette.bg },
  selectedEdge: { borderWidth: rule.major, borderColor: palette.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: rule.hair },
  chip: {
    minHeight: 52,
    minWidth: 84,
    paddingHorizontal: space.md,
    alignItems: 'flex-start',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderWidth: rule.hair,
    borderColor: palette.border,
  },
  chipSelected: { backgroundColor: palette.accent, borderColor: palette.accent },
  textOnAccent: { color: palette.bg },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: rule.hair },
  stepButton: {
    width: hitTarget,
    height: hitTarget,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderWidth: rule.hair,
    borderColor: palette.border,
  },
  stepButtonText: { fontSize: font.h2, fontWeight: '800', color: palette.ink },
  ageValue: {
    fontSize: font.h2,
    fontWeight: '800',
    color: palette.ink,
    minWidth: 72,
    textAlign: 'center',
  },
  pressed: { backgroundColor: 'rgba(32,30,29,0.10)' },
  gap: { marginTop: space.md },
});
