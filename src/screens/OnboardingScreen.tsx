import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BigButton } from '../components/BigButton';
import { Screen } from '../components/Screen';
import { ParentGateModal } from '../safety/ParentGateModal';
import { AGE_GROUPS, type AgeGroupLevel } from '../state/ageGroups';
import { font, palette, radius, shadow, space } from '../theme/tokens';

/**
 * First-launch, one-time setup: which age group is this for?
 *
 * Behind the parent gate — a child shouldn't be the one setting this, the
 * same reasoning as everything else in Parent Zone. "Skip for now" is the
 * one thing that doesn't need the gate: it changes nothing a parent hasn't
 * already implicitly accepted (the sensible default), so there's no
 * judgment call being made without them.
 */
export function OnboardingScreen({ onDone }: { readonly onDone: (ageGroup: AgeGroupLevel) => void }) {
  const [gateOpen, setGateOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  return (
    <Screen>
      <View style={styles.root}>
        <Text style={styles.hero} accessibilityElementsHidden importantForAccessibility="no">
          👋
        </Text>
        <Text style={styles.title} accessibilityRole="header">
          Welcome!
        </Text>

        {!unlocked ? (
          <>
            <Text style={styles.body}>
              Quick one-time setup for a grown-up — picking an age group helps games start at a
              good level.
            </Text>
            <BigButton
              label="Let's set this up"
              icon="🔒"
              onPress={() => setGateOpen(true)}
              style={styles.gap}
            />
            <BigButton
              label="Skip for now"
              tone="quiet"
              onPress={() => onDone(2)}
              style={styles.gap}
            />
          </>
        ) : (
          <>
            <Text style={styles.body}>How old is your child?</Text>
            <View style={styles.choices}>
              {AGE_GROUPS.map((group) => (
                <BigButton
                  key={group.level}
                  label={group.label}
                  icon={group.icon}
                  color={palette.leaf}
                  onPress={() => onDone(group.level)}
                  style={styles.gap}
                />
              ))}
            </View>
            <Text style={styles.footnote}>
              Every game still adjusts up or down on its own after that, round to round — this
              just picks where it starts.
            </Text>
          </>
        )}
      </View>

      <ParentGateModal
        visible={gateOpen}
        onCancel={() => setGateOpen(false)}
        onPass={() => {
          setGateOpen(false);
          setUnlocked(true);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'center',
    padding: space.lg,
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    ...shadow,
  },
  hero: { fontSize: font.hero, textAlign: 'center', marginBottom: space.sm },
  title: { fontSize: font.title, fontWeight: '800', color: palette.ink, textAlign: 'center' },
  body: {
    fontSize: font.body,
    color: palette.inkSoft,
    textAlign: 'center',
    marginTop: space.sm,
    marginBottom: space.md,
  },
  choices: { gap: space.sm },
  gap: { marginTop: space.sm },
  footnote: {
    fontSize: font.body - 4,
    color: palette.inkSoft,
    textAlign: 'center',
    marginTop: space.md,
  },
});
