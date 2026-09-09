import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';

import { findGame } from './src/games/registry';
import type { RoundResult } from './src/games/types';
import { ParentGateModal } from './src/safety/ParentGateModal';
import { HomeScreen } from './src/screens/HomeScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { ParentZoneScreen } from './src/screens/ParentZoneScreen';
import { PlayTimeScreen } from './src/screens/PlayTimeScreen';
import { ProfilesScreen } from './src/screens/ProfilesScreen';
import { TimeUpScreen } from './src/screens/TimeUpScreen';
import { AppProvider, useApp } from './src/state/AppProvider';
import { palette } from './src/theme/tokens';

/**
 * Root navigation.
 *
 * Hand-rolled rather than pulled from a router library: the app has a
 * handful of destinations and no deep links, and every dependency added to a
 * children's app is one more thing to audit. If the screen count grows past
 * what this can carry comfortably, swap in a real router then.
 */
type Route =
  | { readonly name: 'home' }
  | { readonly name: 'game'; readonly gameId: string }
  | { readonly name: 'parent' }
  | { readonly name: 'profiles' }
  | { readonly name: 'playtime' };

/** Which gated destination to land on once the parent gate is passed. */
type GateTarget = 'parent' | 'profiles' | null;

function Root() {
  const {
    ready,
    profiles,
    addProfile,
    verdict,
    finishRound,
    levelForGame,
    startPlaying,
    stopPlaying,
  } = useApp();
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [gateTarget, setGateTarget] = useState<GateTarget>(null);

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

  const openParentZone = useCallback(() => setGateTarget('parent'), []);
  const openProfiles = useCallback(() => setGateTarget('profiles'), []);

  const onRoundComplete = useCallback(
    (gameId: string, result: RoundResult) => finishRound(gameId, result),
    [finishRound],
  );

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={palette.accent} />
      </View>
    );
  }

  // Outranks every other route: nothing else is reachable until a grown-up
  // has created a profile or explicitly skipped doing so.
  if (profiles.length === 0) {
    return <OnboardingScreen onDone={(input) => addProfile(input)} />;
  }

  const gate = (
    <ParentGateModal
      visible={gateTarget != null}
      onCancel={() => setGateTarget(null)}
      onPass={() => {
        const target = gateTarget;
        setGateTarget(null);
        if (target === 'parent') setRoute({ name: 'parent' });
        else if (target === 'profiles') setRoute({ name: 'profiles' });
      }}
    />
  );

  if (route.name === 'parent') {
    return (
      <>
        {/* Already behind the gate to be on this screen at all, so this goes
            straight to Profiles rather than through `openProfiles` — that one
            is for Home's avatar button, which isn't gated yet when tapped. */}
        <ParentZoneScreen
          onClose={() => setRoute({ name: 'home' })}
          onOpenProfiles={() => setRoute({ name: 'profiles' })}
        />
        {gate}
      </>
    );
  }

  // The `TIME` tab. Not gated: reading how long you have played changes
  // nothing, and only Parent Zone can move a limit.
  if (route.name === 'playtime' && !limitReached) {
    return (
      <>
        <PlayTimeScreen
          onClose={() => setRoute({ name: 'home' })}
          onOpenParentZone={openParentZone}
          onOpenProfiles={openProfiles}
        />
        {gate}
      </>
    );
  }

  if (route.name === 'profiles') {
    return (
      <>
        <ProfilesScreen onClose={() => setRoute({ name: 'home' })} />
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
        onOpenProfiles={openProfiles}
        onOpenPlayTime={() => setRoute({ name: 'playtime' })}
      />
      {gate}
    </>
  );
}

export default function App() {
  // Archivo ships in the bundle rather than being fetched — the design calls
  // for it, and this app makes no network requests at all, so a webfont was
  // never an option. Each weight is registered as its own family: a custom
  // font on Android does not switch faces on `fontWeight`, so the face has
  // to be named directly (see `src/theme/type.ts`).
  const [fontsLoaded, fontError] = useFonts({
    Archivo: require('./assets/fonts/Archivo-Regular.ttf'),
    ArchivoExtraBold: require('./assets/fonts/Archivo-ExtraBold.ttf'),
  });

  // Holding the first frame until the faces are in avoids the flash of
  // system type at the wrong weight that made this look off in the first
  // place. It is reading two local files, so it is not a wait anyone sees.
  // A face that fails to load is a worse look, not a broken app: fall through
  // to the platform's own type rather than holding a blank screen forever.
  if (!fontsLoaded && !fontError) {
    return <View style={styles.loading} />;
  }

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
