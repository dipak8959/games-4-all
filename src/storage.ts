import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The only persistence layer in the app.
 *
 * Everything written here stays in the app's own sandbox on the device. There is
 * no sync, no backup target, no account, and no identifier that survives an
 * uninstall. `eraseAllData` is the complete deletion path surfaced to parents.
 */

const PREFIX = 'g4a:';

/** Every key the app is allowed to persist. Keeping this closed makes the
 *  "delete everything" promise in Parent Zone auditable. */
export const StorageKeys = {
  settings: `${PREFIX}settings`,
  progress: `${PREFIX}progress`,
  usage: `${PREFIX}usage`,
  freshness: `${PREFIX}freshness`,
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];

export async function readJson<T>(key: StorageKey, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as object) } as T;
  } catch {
    // A corrupt or unreadable value must never wedge a child out of the app.
    return fallback;
  }
}

export async function writeJson(key: StorageKey, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Persistence is best-effort; play continues from in-memory state.
  }
}

/** Removes every key this app owns. Used by the parent-facing delete control. */
export async function eraseAllData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove(Object.values(StorageKeys));
  } catch {
    // Fall through: the caller resets in-memory state regardless.
  }
}
