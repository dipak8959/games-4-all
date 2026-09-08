import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BigButton } from './BigButton';
import { AVATAR_CHOICES, clampAge, NAME_CHOICES, type ProfileInput } from '../state/profiles';
import { font, hitTarget, palette, radius, space } from '../theme/tokens';

/**
 * The form behind both "create your first profile" (`OnboardingScreen`) and
 * "add a profile" (`ProfilesScreen`) — kept as one component so the two
 * flows can never drift into asking for a name, avatar, and age two
 * different ways.
 *
 * No text input anywhere: a name is picked from a small fixed list, an
 * avatar from a small fixed set of emoji, and age from a stepper. That
 * keeps the "collect nothing" promise literal for this screen — there is no
 * keyboard involved, so there is nothing typed to even consider sensitive.
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
      <Text style={styles.label}>Pick an avatar</Text>
      <View style={styles.chips}>
        {AVATAR_CHOICES.map((choice) => (
          <Pressable
            key={choice}
            accessibilityRole="radio"
            accessibilityLabel={`Avatar ${choice}`}
            accessibilityState={{ selected: avatar === choice }}
            onPress={() => setAvatar(choice)}
            style={[styles.avatarChip, avatar === choice && styles.chipSelected]}
          >
            <Text style={styles.avatarGlyph}>{choice}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Pick a name</Text>
      <View style={styles.chips}>
        {NAME_CHOICES.map((choice) => (
          <Pressable
            key={choice}
            accessibilityRole="radio"
            accessibilityLabel={choice}
            accessibilityState={{ selected: name === choice }}
            onPress={() => setName(choice)}
            style={[styles.nameChip, name === choice && styles.chipSelected]}
          >
            <Text style={[styles.nameText, name === choice && styles.nameTextSelected]}>{choice}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>How old?</Text>
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
        icon={avatar}
        onPress={() => onSave({ name, avatar, age: clampAge(age) })}
        style={styles.gap}
      />
      {onCancel ? <BigButton label="Cancel" tone="quiet" onPress={onCancel} style={styles.gap} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.xs },
  label: { fontSize: font.body, fontWeight: '700', color: palette.ink, marginTop: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingTop: space.xs },
  avatarChip: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: palette.border,
    backgroundColor: palette.surfaceAlt,
  },
  avatarGlyph: { fontSize: 28 },
  nameChip: {
    minHeight: 52,
    minWidth: 68,
    paddingHorizontal: space.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: palette.border,
    backgroundColor: palette.surfaceAlt,
  },
  nameText: { fontSize: font.body - 2, fontWeight: '700', color: palette.ink },
  nameTextSelected: { color: '#FFFFFF' },
  chipSelected: { backgroundColor: palette.sky, borderColor: palette.sky },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingTop: space.xs },
  stepButton: {
    width: hitTarget,
    height: hitTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: palette.surfaceAlt,
    borderWidth: 2,
    borderColor: palette.border,
  },
  stepButtonText: { fontSize: font.title, fontWeight: '800', color: palette.ink },
  ageValue: { fontSize: font.hero - 8, fontWeight: '800', color: palette.ink, minWidth: 72, textAlign: 'center' },
  pressed: { transform: [{ scale: 0.95 }] },
  gap: { marginTop: space.md },
});
