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
import {
  addProfile as addProfileToState,
  EMPTY_PROFILES,
  getActiveProfile,
  removeProfile as removeProfileFromState,
  switchProfile as switchProfileInState,
  updateProfile as updateProfileInState,
  type Profile,
  type ProfileInput,
  type ProfilesState,
} from './profiles';
import { DEFAULT_LEVEL, startingLevelForAge } from '../games/types';

/**
 * Single source of truth for profiles, settings, progress, and screen-time
 * accounting.
 *
 * Everything that varies per-person — settings, progress, usage, freshness —
 * is stored as a record keyed by profile id, so a parent and each child
 * sharing this device keep fully separate stars, adaptive levels, and play
 * preferences under the same four storage keys (see `storage.ts`; adding
 * profiles never grows the enumerated key list, only the value shape of the
 * keys that already exist).
 *
 * Screen time is accrued on a ticking interval rather than from wall-clock
 * deltas alone, and only while the app is foregrounded and a game is actually
 * being played — time on the home screen is not charged against the limit.
 */

const TICK_MS = 5000;

type ById<T> = Readonly<Record<string, T>>;

type AppContextValue = {
  readonly ready: boolean;
  readonly profiles: readonly Profile[];
  readonly activeProfile: Profile | null;
  readonly settings: Settings;
  readonly progress: Progress;
  readonly usage: UsageState;
  readonly verdict: LimitVerdict;
  readonly updateSettings: (patch: Partial<Settings>) => void;
  readonly finishRound: (gameId: string, result: { stars: number; level: number }) => void;
  /** The level a game should open at: its own adaptive level once it has been
   *  played, or a fixed default before that. */
  readonly levelForGame: (gameId: string) => number;
  /** What a game last showed, so it can avoid repeating it — survives leaving
   *  the game and reopening the app, not just "Play again" within a session. */
  readonly getFreshness: (gameId: string) => unknown;
  readonly setFreshness: (gameId: string, value: unknown) => void;
  readonly startPlaying: () => void;
  readonly stopPlaying: () => void;
  /** Wipes every profile and every byte this app has ever stored. */
  readonly resetEverything: () => Promise<void>;
  /** Creates a profile and returns its new id. The very first profile ever
   *  created becomes active automatically. */
  readonly addProfile: (input: ProfileInput) => string;
  readonly updateProfileInfo: (id: string, patch: Partial<ProfileInput>) => void;
  readonly removeProfileById: (id: string) => void;
  readonly switchActiveProfile: (id: string) => void;
};

const AppContext = createContext<AppContextValue | null>(null);

function makeProfileId(): string {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profilesState, setProfilesState] = useState<ProfilesState>(EMPTY_PROFILES);
  const [settingsById, setSettingsById] = useState<ById<Settings>>({});
  const [progressById, setProgressById] = useState<ById<Progress>>({});
  const [usageById, setUsageById] = useState<ById<UsageState>>({});
  const [freshnessById, setFreshnessById] = useState<ById<Freshness>>({});

  /** Whether a game screen is currently mounted and foregrounded. */
  const playingRef = useRef(false);
  const lastTickRef = useRef<number>(Date.now());

  const activeProfile = useMemo(() => getActiveProfile(profilesState), [profilesState]);
  const activeId = activeProfile?.id ?? null;
  // Read inside callbacks via a ref so persistence callbacks created before a
  // profile switch still write to the profile that was active when called,
  // without every callback needing activeId in its dependency array.
  const activeIdRef = useRef<string | null>(activeId);
  activeIdRef.current = activeId;

  const settings = activeId ? settingsById[activeId] ?? DEFAULT_SETTINGS : DEFAULT_SETTINGS;
  const progress = activeId ? progressById[activeId] ?? EMPTY_PROGRESS : EMPTY_PROGRESS;
  const usage = activeId ? usageById[activeId] ?? emptyUsage(new Date()) : emptyUsage(new Date());
  const freshness = activeId ? freshnessById[activeId] ?? EMPTY_FRESHNESS : EMPTY_FRESHNESS;

  // Load persisted state once at startup.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [loadedProfiles, loadedSettings, loadedProgress, loadedUsage, loadedFreshness] = await Promise.all([
        readJson<ProfilesState>(StorageKeys.profiles, EMPTY_PROFILES),
        readJson<ById<Settings>>(StorageKeys.settings, {}),
        readJson<ById<Progress>>(StorageKeys.progress, {}),
        readJson<ById<UsageState>>(StorageKeys.usage, {}),
        readJson<ById<Freshness>>(StorageKeys.freshness, {}),
      ]);
      if (cancelled) return;
      setProfilesState(loadedProfiles);
      setSettingsById(loadedSettings);
      setProgressById(loadedProgress);
      // A fresh launch is always a fresh sitting, for every profile.
      const freshSessionUsage: Record<string, UsageState> = {};
      for (const [id, u] of Object.entries(loadedUsage)) {
        freshSessionUsage[id] = endSession(rolloverIfNeeded(u, new Date()));
      }
      setUsageById(freshSessionUsage);
      setFreshnessById(loadedFreshness);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Mirror the OS "reduce motion" setting onto the active profile on first
  // load, so a child who needs calmer visuals gets them without a parent
  // having to find the toggle.
  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (cancelled || !enabled || !activeIdRef.current) return;
        const id = activeIdRef.current;
        setSettingsById((prev) => ({
          ...prev,
          [id]: { ...(prev[id] ?? DEFAULT_SETTINGS), reduceMotion: true },
        }));
      })
      .catch(() => {
        // Not available on every platform; the in-app toggle still works.
      });
    return () => {
      cancelled = true;
    };
  }, [ready]);

  // Takes a transform rather than a computed value, so callers always apply
  // it to the freshest stored usage for that profile — never a value closed
  // over from whatever render created the calling callback.
  const persistUsage = useCallback((id: string, transform: (u: UsageState) => UsageState) => {
    setUsageById((prev) => {
      const current = prev[id] ?? emptyUsage(new Date());
      const next = transform(current);
      const merged = { ...prev, [id]: next };
      void writeJson(StorageKeys.usage, merged);
      return merged;
    });
  }, []);

  // Accrue play time while a game is open, against whichever profile is
  // active at the moment the tick lands.
  useEffect(() => {
    const id = setInterval(() => {
      if (!playingRef.current || !activeIdRef.current) {
        lastTickRef.current = Date.now();
        return;
      }
      const now = Date.now();
      const elapsed = now - lastTickRef.current;
      lastTickRef.current = now;
      const profileId = activeIdRef.current;
      setUsageById((prev) => {
        const next = accrue(prev[profileId] ?? emptyUsage(new Date(now)), elapsed, new Date(now));
        const merged = { ...prev, [profileId]: next };
        void writeJson(StorageKeys.usage, merged);
        return merged;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  // Backgrounding ends the sitting: time spent in another app is not play
  // time, and coming back should not resume a half-spent session limit
  // mid-stride.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      const id = activeIdRef.current;
      if (state === 'active') {
        lastTickRef.current = Date.now();
        if (id) {
          setUsageById((prev) => ({ ...prev, [id]: rolloverIfNeeded(prev[id] ?? emptyUsage(new Date()), new Date()) }));
        }
        return;
      }
      playingRef.current = false;
      if (id) persistUsage(id, endSession);
    });
    return () => sub.remove();
  }, [persistUsage]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    const id = activeIdRef.current;
    if (!id) return;
    setSettingsById((prev) => {
      const next = { ...(prev[id] ?? DEFAULT_SETTINGS), ...patch };
      const merged = { ...prev, [id]: next };
      void writeJson(StorageKeys.settings, merged);
      return merged;
    });
  }, []);

  const finishRound = useCallback((gameId: string, result: { stars: number; level: number }) => {
    const id = activeIdRef.current;
    if (!id) return;
    setProgressById((prev) => {
      const next = recordRound(prev[id] ?? EMPTY_PROGRESS, gameId, result);
      const merged = { ...prev, [id]: next };
      void writeJson(StorageKeys.progress, merged);
      return merged;
    });
  }, []);

  const startPlaying = useCallback(() => {
    lastTickRef.current = Date.now();
    playingRef.current = true;
  }, []);

  const stopPlaying = useCallback(() => {
    playingRef.current = false;
    const id = activeIdRef.current;
    if (id) persistUsage(id, endSession);
  }, [persistUsage]);

  const levelForGame = useCallback(
    (gameId: string) =>
      progressFor(progress, gameId).currentLevel ??
      (activeProfile ? startingLevelForAge(activeProfile.age) : DEFAULT_LEVEL),
    [progress, activeProfile],
  );

  const getFreshness = useCallback((gameId: string) => freshnessFor(freshness, gameId), [freshness]);

  const setFreshness = useCallback((gameId: string, value: unknown) => {
    const id = activeIdRef.current;
    if (!id) return;
    setFreshnessById((prev) => {
      const next = withFreshness(prev[id] ?? EMPTY_FRESHNESS, gameId, value);
      const merged = { ...prev, [id]: next };
      void writeJson(StorageKeys.freshness, merged);
      return merged;
    });
  }, []);

  const resetEverything = useCallback(async () => {
    await eraseAllData();
    setProfilesState(EMPTY_PROFILES);
    setSettingsById({});
    setProgressById({});
    setUsageById({});
    setFreshnessById({});
  }, []);

  const addProfile = useCallback((input: ProfileInput): string => {
    const id = makeProfileId();
    setProfilesState((prev) => {
      const next = addProfileToState(prev, input, id);
      void writeJson(StorageKeys.profiles, next);
      return next;
    });
    return id;
  }, []);

  const updateProfileInfo = useCallback((id: string, patch: Partial<ProfileInput>) => {
    setProfilesState((prev) => {
      const next = updateProfileInState(prev, id, patch);
      void writeJson(StorageKeys.profiles, next);
      return next;
    });
  }, []);

  const removeProfileById = useCallback((id: string) => {
    setProfilesState((prev) => {
      const next = removeProfileFromState(prev, id);
      void writeJson(StorageKeys.profiles, next);
      return next;
    });
  }, []);

  const switchActiveProfile = useCallback(
    (id: string) => {
      // Switching away from a profile mid-sitting ends that sitting, the same
      // way backgrounding the app does — a new active profile always starts
      // its own fresh session, never inherits one in progress.
      const outgoing = activeIdRef.current;
      if (outgoing && outgoing !== id) {
        playingRef.current = false;
        persistUsage(outgoing, endSession);
      }
      setProfilesState((prev) => {
        const next = switchProfileInState(prev, id);
        void writeJson(StorageKeys.profiles, next);
        return next;
      });
    },
    [persistUsage],
  );

  const verdict = useMemo(() => evaluate(usage, settings), [usage, settings]);

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      profiles: profilesState.profiles,
      activeProfile,
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
      addProfile,
      updateProfileInfo,
      removeProfileById,
      switchActiveProfile,
    }),
    [
      ready,
      profilesState.profiles,
      activeProfile,
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
      addProfile,
      updateProfileInfo,
      removeProfileById,
      switchActiveProfile,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
