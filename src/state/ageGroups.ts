/**
 * Age groups.
 *
 * A parent-facing, concrete alternative to an abstract "Easy/Medium/Harder"
 * difficulty picker — three bands spanning this app's target age range
 * (roughly 3-7). The level numbers are exactly what already fed each game's
 * starting difficulty (see `AppProvider.levelForGame`), so this is a rename
 * and a friendlier presentation of that same concept, not a second setting
 * layered on top of it.
 *
 * Kept as one shared list so the onboarding screen and Parent Zone render
 * from a single source rather than duplicating labels.
 */

export type AgeGroupLevel = 1 | 2 | 3;

export type AgeGroupDef = {
  readonly level: AgeGroupLevel;
  readonly label: string;
  readonly icon: string;
};

export const AGE_GROUPS: readonly AgeGroupDef[] = [
  { level: 1, label: '3-4 years', icon: '🧸' },
  { level: 2, label: '5-6 years', icon: '🎈' },
  { level: 3, label: '7+ years', icon: '🚀' },
];

/** Used before a parent has ever chosen — including a child who taps around
 *  before any adult sets it up. The middle band is the least likely to feel
 *  badly wrong in either direction. */
export const DEFAULT_AGE_GROUP: AgeGroupLevel = 2;

export function ageGroupLabel(level: AgeGroupLevel): string {
  return AGE_GROUPS.find((g) => g.level === level)?.label ?? AGE_GROUPS[0].label;
}

export function ageGroupIcon(level: AgeGroupLevel): string {
  return AGE_GROUPS.find((g) => g.level === level)?.icon ?? AGE_GROUPS[0].icon;
}
