import { DEFAULT_LIMITS, type ScreenTimeLimits } from '../safety/screenTime';

/**
 * Per-profile play preferences. Kept separate from `Profile` itself
 * (`src/state/profiles.ts`) — a profile is "who", settings are "how they
 * like to play" — and stored keyed by profile id in `AppProvider`, so a
 * parent's sound/haptics/limits never leak into a child's profile or vice
 * versa.
 */
export type Settings = ScreenTimeLimits & {
  /** Sound effects for correct/incorrect feedback. */
  readonly soundOn: boolean;
  /** Vibration feedback. Some children find it aversive, so it is switchable. */
  readonly hapticsOn: boolean;
  /** Honours a child who is sensitive to movement; also mirrors the OS setting. */
  readonly reduceMotion: boolean;
  /** Game ids this profile has pinned as favourites, in the order pinned.
   *  Shown as a shortcut row at the top of Home so a growing catalogue never
   *  forces a return trip through search just to reach the games this
   *  profile actually plays. Toggled straight from a game's card — no parent
   *  gate needed, since it changes nothing about what's available, only how
   *  quickly this profile reaches what they already chose. */
  readonly pinnedGameIds: readonly string[];
};

export const DEFAULT_SETTINGS: Settings = {
  ...DEFAULT_LIMITS,
  soundOn: true,
  hapticsOn: true,
  reduceMotion: false,
  pinnedGameIds: [],
};

/** Pins `gameId` if it isn't already pinned, unpins it if it is. Newly
 *  pinned games join at the end, so the favourites row stays in the order a
 *  profile actually pinned them rather than jumping around. */
export function togglePinned(settings: Settings, gameId: string): Settings {
  const pinned = settings.pinnedGameIds.includes(gameId)
    ? settings.pinnedGameIds.filter((id) => id !== gameId)
    : [...settings.pinnedGameIds, gameId];
  return { ...settings, pinnedGameIds: pinned };
}
