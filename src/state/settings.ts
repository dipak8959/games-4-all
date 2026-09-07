import { DEFAULT_LIMITS, type ScreenTimeLimits } from '../safety/screenTime';
import { DEFAULT_AGE_GROUP, type AgeGroupLevel } from './ageGroups';

export type Settings = ScreenTimeLimits & {
  /** Sound effects for correct/incorrect feedback. */
  readonly soundOn: boolean;
  /** Vibration feedback. Some children find it aversive, so it is switchable. */
  readonly hapticsOn: boolean;
  /** Honours a child who is sensitive to movement; also mirrors the OS setting. */
  readonly reduceMotion: boolean;
  /** Seeds where each game's adaptive difficulty starts — see `nextLevel` in
   *  `src/games/types.ts` for how it moves from there. Chosen once at first
   *  launch (`OnboardingScreen`) and changeable any time after in Parent
   *  Zone; never gates which games are shown, only their starting level. */
  readonly ageGroup: AgeGroupLevel;
  /** Whether the first-launch age-group step has been completed — picked or
   *  explicitly skipped. Gates `OnboardingScreen` in `App.tsx`. */
  readonly onboardingComplete: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  ...DEFAULT_LIMITS,
  soundOn: true,
  hapticsOn: true,
  reduceMotion: false,
  ageGroup: DEFAULT_AGE_GROUP,
  onboardingComplete: false,
};
