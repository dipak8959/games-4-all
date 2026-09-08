import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BigButton } from '../components/BigButton';
import { ProfileEditor } from '../components/ProfileEditor';
import { Screen } from '../components/Screen';
import { ParentGateModal } from '../safety/ParentGateModal';
import { DEFAULT_AGE, DEFAULT_AVATAR, DEFAULT_NAME, type ProfileInput } from '../state/profiles';
import { font, palette, radius, shadow, space } from '../theme/tokens';

/**
 * First-launch, one-time setup: create the first profile.
 *
 * Behind the parent gate — a child shouldn't be the one setting this, the
 * same reasoning as everything else in Parent Zone. "Skip for now" is the
 * one thing that doesn't need the gate: it creates a sensible default
 * profile rather than asking a judgment call of anyone, so setup never
 * blocks play. More profiles — for siblings, or a grown-up who wants their
 * own — can always be added later from Parent Zone.
 */
export function OnboardingScreen({ onDone }: { readonly onDone: (input: ProfileInput) => void }) {
  const [gateOpen, setGateOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
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
                Quick one-time setup for a grown-up — creating a profile helps games start at a
                good level for whoever's playing.
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
                onPress={() => onDone({ name: DEFAULT_NAME, avatar: DEFAULT_AVATAR, age: DEFAULT_AGE })}
                style={styles.gap}
              />
            </>
          ) : (
            <>
              <Text style={styles.body}>Who's playing?</Text>
              <ProfileEditor onSave={onDone} saveLabel="Start playing" />
              <Text style={styles.footnote}>
                Every game still adjusts up or down on its own after that, round to round — this
                just picks a starting point, and which games are age-appropriate to show.
              </Text>
            </>
          )}
        </View>
      </ScrollView>

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
  scroll: { flexGrow: 1, justifyContent: 'center' },
  root: {
    alignItems: 'stretch',
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
  gap: { marginTop: space.sm },
  footnote: {
    fontSize: font.body - 4,
    color: palette.inkSoft,
    textAlign: 'center',
    marginTop: space.md,
  },
});
