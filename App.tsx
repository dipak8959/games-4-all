import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { findGame } from './src/games/registry';
import type { RoundResult } from './src/games/types';
import { ParentGateModal } from './src/safety/ParentGateModal';
import { HomeScreen } from './src/screens/HomeScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { ParentZoneScreen } from './src/screens/ParentZoneScreen';
import { TimeUpScreen } from './src/screens/TimeUpScreen';
import { AppProvider, useApp } from './src/state/AppProvider';
import { palette } from './src/theme/tokens';

/**
 * Root navigation.
 *
 * Hand-rolled rather than pulled from a router library: the app has four
 * destinations and no deep links, and every dependency added to a children's
 * app is one more thing to audit. If the screen count grows past what this can
 * carry comfortably, swap in a real router then.
 */
type Route =
  | { readonly name: 'home' }
  | { readonly name: 'game'; readonly gameId: string }
  | { readonly name: 'parent' };

function Root() {
  const { ready, settings, updateSettings, verdict, finishRound, levelForGame, startPlaying, stopPlaying } =
    useApp();
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [gateOpen, setGateOpen] = useState(false);

  const inGame = route.name === 'game';
  const limitReached = verdict.kind !== 'ok';

  // Charge play time only while a game is actually on screen.
  useEffect(() => {
    if (inGame) startPlaying();
    else stopPlaying();
  }, [inGame, startPlaying, stopPlaying]);

  // A limit reached mid-game returns the child to the stop screen immediately.
  useEffect(() => {
    if (limitReached && inGame) setRoute({ name: 'home' });
  }, [limitReached, inGame]);

  const openParentZone = useCallback(() => setGateOpen(true), []);

  const onRoundComplete = useCallback(
    (gameId: string, result: RoundResult) => finishRound(gameId, result),
    [finishRound],
  );

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={palette.sky} />
      </View>
    );
  }

  // Outranks every other route: nothing else is reachable until a grown-up
  // has picked an age group or explicitly skipped doing so.
  if (!settings.onboardingComplete) {
    return (
      <OnboardingScreen
        onDone={(ageGroup) => updateSettings({ ageGroup, onboardingComplete: true })}
      />
    );
  }

  const gate = (
    <ParentGateModal
      visible={gateOpen}
      onCancel={() => setGateOpen(false)}
      onPass={() => {
        setGateOpen(false);
        setRoute({ name: 'parent' });
      }}
    />
  );

  if (route.name === 'parent') {
    return (
      <>
        <ParentZoneScreen onClose={() => setRoute({ name: 'home' })} />
        {gate}
      </>
    );
  }

  // The stop screen outranks everything except Parent Zone: a child cannot
  // navigate around a reached limit.
  if (limitReached) {
    return (
      <>
        <TimeUpScreen
          kind={verdict.kind === 'daily-over' ? 'daily-over' : 'session-over'}
          onOpenParentZone={openParentZone}
        />
        {gate}
      </>
    );
  }

  if (route.name === 'game') {
    const game = findGame(route.gameId);
    if (game) {
      const { Screen: GameScreen } = game;
      return (
        <>
          <GameScreen
            level={levelForGame(game.id)}
            onRoundComplete={(result) => onRoundComplete(game.id, result)}
            onExit={() => setRoute({ name: 'home' })}
          />
          {gate}
        </>
      );
    }
  }

  return (
    <>
      <HomeScreen
        onOpenGame={(gameId) => setRoute({ name: 'game', gameId })}
        onOpenParentZone={openParentZone}
      />
      {gate}
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppProvider>
        <Root />
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.bg },
});
