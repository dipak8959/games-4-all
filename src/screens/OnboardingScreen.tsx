import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BigButton } from '../components/BigButton';
import { Icon } from '../components/Icon';
import { ProfileEditor } from '../components/ProfileEditor';
import { Rule } from '../components/Rule';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { ParentGateModal } from '../safety/ParentGateModal';
import { DEFAULT_AGE, DEFAULT_AVATAR, DEFAULT_NAME, type ProfileInput } from '../state/profiles';
import { gutter, palette, space } from '../theme/tokens';
import { type } from '../theme/type';

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
    <Screen padded={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={type.mono}>OFFLINE SUPER APP</Text>
          <Text style={type.h2} accessibilityRole="header">
            GAMES 4 ALL
          </Text>
        </View>
        <Rule weight="major" />

        <View style={styles.offlineRow}>
          <Icon name="offline" size={16} color={palette.accentText} />
          <Text style={type.secondary}>
            Works with no internet. No ads, no chat, no purchases, no accounts.
          </Text>
        </View>
        <Rule weight="major" />

        {!unlocked ? (
          <>
            <SectionHeader label="ONE-TIME SETUP" meta="GROWN-UPS" />
            <View style={styles.block}>
              <Text style={type.body}>
                Creating a profile helps games start at a good level for whoever's playing, and
                keeps everyone's stars separate.
              </Text>
              <BigButton
                label="Let's set this up"
                icon="lock"
                note="GROWN-UPS ONLY"
                chevron
                onPress={() => setGateOpen(true)}
                style={styles.gap}
              />
              <BigButton
                label="Skip for now"
                tone="quiet"
                onPress={() => onDone({ name: DEFAULT_NAME, avatar: DEFAULT_AVATAR, age: DEFAULT_AGE })}
                style={styles.gap}
              />
            </View>
          </>
        ) : (
          <>
            <SectionHeader label="WHO IS PLAYING" />
            <View style={styles.block}>
              <ProfileEditor onSave={onDone} saveLabel="Start playing" />
              <Text style={[type.meta, styles.gap]}>
                Every game still adjusts up or down on its own after that, round to round — this
                just picks a starting point, and which games are age-appropriate to show.
              </Text>
            </View>
          </>
        )}
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
  scroll: { paddingBottom: space.xl },
  header: { paddingHorizontal: gutter, paddingTop: space.xl, paddingBottom: space.lg, gap: space.xs },
  offlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: gutter,
    paddingVertical: 11,
  },
  block: { paddingHorizontal: gutter, paddingBottom: space.lg },
  gap: { marginTop: space.md },
});
