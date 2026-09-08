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
};

export const DEFAULT_SETTINGS: Settings = {
  ...DEFAULT_LIMITS,
  soundOn: true,
  hapticsOn: true,
  reduceMotion: false,
};
