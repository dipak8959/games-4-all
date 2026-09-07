import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AccessibilityInfo, AppState, type AppStateStatus } from 'react-native';

import { eraseAllData, readJson, StorageKeys, writeJson } from '../storage';
import {
  accrue,
  emptyUsage,
  endSession,
  evaluate,
  rolloverIfNeeded,
  type LimitVerdict,
  type UsageState,
} from '../safety/screenTime';
import { DEFAULT_SETTINGS, type Settings } from './settings';
import { EMPTY_PROGRESS, progressFor, recordRound, type Progress } from './progress';
import { EMPTY_FRESHNESS, freshnessFor, withFreshness, type Freshness } from './freshness';

/**
 * Single source of truth for settings, progress, and screen-time accounting.
 *
 * Screen time is accrued on a ticking interval rather than from wall-clock
 * deltas alone, and only while the app is foregrounded and a game is actually
 * being played — time on the home screen is not charged against the limit.
 */

const TICK_MS = 5000;

type AppContextValue = {
  readonly ready: boolean;
  readonly settings: Settings;
  readonly progress: Progress;
  readonly usage: UsageState;
  readonly verdict: LimitVerdict;
  readonly updateSettings: (patch: Partial<Settings>) => void;
  readonly finishRound: (gameId: string, result: { stars: number; level: number }) => void;
  /** The level a game should open at: its own adaptive level once it has been
   *  played, or the parent's chosen starting difficulty before that. */
  readonly levelForGame: (gameId: string) => number;
  /** What a game last showed, so it can avoid repeating it — survives leaving
   *  the game and reopening the app, not just "Play again" within a session. */
  readonly getFreshness: (gameId: string) => unknown;
  readonly setFreshness: (gameId: string, value: unknown) => void;
  readonly startPlaying: () => void;
  readonly stopPlaying: () => void;
  readonly resetEverything: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);
  const [usage, setUsage] = useState<UsageState>(() => emptyUsage(new Date()));
  const [freshness, setFreshnessState] = useState<Freshness>(EMPTY_FRESHNESS);

  /** Whether a game screen is currently mounted and foregrounded. */
  const playingRef = useRef(false);
  const lastTickRef = useRef<number>(Date.now());

  // Load persisted state once at startup.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [loadedSettings, loadedProgress, loadedUsage, loadedFreshness] = await Promise.all([
        readJson<Settings>(StorageKeys.settings, DEFAULT_SETTINGS),
        readJson<Progress>(StorageKeys.progress, EMPTY_PROGRESS),
        readJson<UsageState>(StorageKeys.usage, emptyUsage(new Date())),
        readJson<Freshness>(StorageKeys.freshness, EMPTY_FRESHNESS),
      ]);
      if (cancelled) return;
      setSettings(loadedSettings);
      setProgress(loadedProgress);
      // A fresh launch is always a fresh sitting.
      setUsage(endSession(rolloverIfNeeded(loadedUsage, new Date())));
      setFreshnessState(loadedFreshness);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Mirror the OS "reduce motion" setting on first load, so a child who needs
  // calmer visuals gets them without a parent having to find the toggle.
  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (!cancelled && enabled) setSettings((s) => ({ ...s, reduceMotion: true }));
      })
      .catch(() => {
        // Not available on every platform; the in-app toggle still works.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const persistUsage = useCallback((next: UsageState) => {
    void writeJson(StorageKeys.usage, next);
  }, []);

  // Accrue play time while a game is open.
  useEffect(() => {
    const id = setInterval(() => {
      if (!playingRef.current) {
        lastTickRef.current = Date.now();
        return;
      }
      const now = Date.now();
      const elapsed = now - lastTickRef.current;
      lastTickRef.current = now;
      setUsage((prev) => {
        const next = accrue(prev, elapsed, new Date(now));
        persistUsage(next);
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [persistUsage]);

  // Backgrounding ends the sitting: time spent in another app is not play time,
  // and coming back should not resume a half-spent session limit mid-stride.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        lastTickRef.current = Date.now();
        setUsage((prev) => rolloverIfNeeded(prev, new Date()));
        return;
      }
      playingRef.current = false;
      setUsage((prev) => {
        const next = endSession(prev);
        persistUsage(next);
        return next;
      });
    });
    return () => sub.remove();
  }, [persistUsage]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      void writeJson(StorageKeys.settings, next);
      return next;
    });
  }, []);

  const finishRound = useCallback(
    (gameId: string, result: { stars: number; level: number }) => {
      setProgress((prev) => {
        const next = recordRound(prev, gameId, result);
        void writeJson(StorageKeys.progress, next);
        return next;
      });
    },
    [],
  );

  const startPlaying = useCallback(() => {
    lastTickRef.current = Date.now();
    playingRef.current = true;
  }, []);

  const stopPlaying = useCallback(() => {
    playingRef.current = false;
    setUsage((prev) => {
      const next = endSession(prev);
      persistUsage(next);
      return next;
    });
  }, [persistUsage]);

  const levelForGame = useCallback(
    (gameId: string) => progressFor(progress, gameId).currentLevel ?? settings.difficulty,
    [progress, settings.difficulty],
  );

  const getFreshness = useCallback((gameId: string) => freshnessFor(freshness, gameId), [freshness]);

  const setFreshness = useCallback((gameId: string, value: unknown) => {
    setFreshnessState((prev) => {
      const next = withFreshness(prev, gameId, value);
      void writeJson(StorageKeys.freshness, next);
      return next;
    });
  }, []);

  const resetEverything = useCallback(async () => {
    await eraseAllData();
    setSettings(DEFAULT_SETTINGS);
    setProgress(EMPTY_PROGRESS);
    setUsage(emptyUsage(new Date()));
    setFreshnessState(EMPTY_FRESHNESS);
  }, []);

  const verdict = useMemo(() => evaluate(usage, settings), [usage, settings]);

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      settings,
      progress,
      usage,
      verdict,
      updateSettings,
      finishRound,
      levelForGame,
      getFreshness,
      setFreshness,
      startPlaying,
      stopPlaying,
      resetEverything,
    }),
    [
      ready,
      settings,
      progress,
      usage,
      verdict,
      updateSettings,
      finishRound,
      levelForGame,
      getFreshness,
      setFreshness,
      startPlaying,
      stopPlaying,
      resetEverything,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
