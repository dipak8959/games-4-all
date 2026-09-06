import { DEFAULT_LIMITS, type ScreenTimeLimits } from '../safety/screenTime';

export type Settings = ScreenTimeLimits & {
  /** Sound effects for correct/incorrect feedback. */
  readonly soundOn: boolean;
  /** Vibration feedback. Some children find it aversive, so it is switchable. */
  readonly hapticsOn: boolean;
  /** Honours a child who is sensitive to movement; also mirrors the OS setting. */
  readonly reduceMotion: boolean;
  /** Difficulty floor chosen by a parent, 1-3. Games still adapt within it. */
  readonly difficulty: 1 | 2 | 3;
};

export const DEFAULT_SETTINGS: Settings = {
  ...DEFAULT_LIMITS,
  soundOn: true,
  hapticsOn: true,
  reduceMotion: false,
  difficulty: 1,
};
