import { fromHex, pbkdf2, toHex, utf8 } from '../util/sha256';

/**
 * The admin lock: the owner's password, for testing.
 *
 * Admin mode lets the owner see and play every game whatever the profile's
 * age, at any level, without it being recorded against a child's profile or
 * their play time. It sits behind the parent gate *and* this password, and
 * lasts only until the app is closed — it is never saved, so it can't be
 * left on for a child by accident.
 *
 * The repository is public, so the password is not in it. What is stored is
 * a salted PBKDF2-SHA256 digest of it; the check derives the same digest
 * from whatever is typed and compares. That keeps the password itself out
 * of the source and the app bundle.
 *
 * It is a convenience lock, not security: the app is offline and its code
 * is on the device, so a determined person could edit the check out, or try
 * guesses against the digest on their own computer. Admin mode only changes
 * which games are listed and at what level, so nothing is exposed if they
 * did — but the password should not be one that is used anywhere else.
 */

const SALT = '0bd7375abae3cd00c9c2ee73b75576b2';
const DIGEST = '3ba2385625d41fd0f9f9936f829d4bd75b97bc8f02157e9e5746ffcc6d5980ac';
/** Enough to slow guessing, few enough to check in a moment on a phone. */
export const ITERATIONS = 10000;

/** Constant-time comparison, so how long a wrong guess takes says nothing
 *  about how close it was. */
function sameHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function digestOf(password: string, salt: string = SALT, iterations: number = ITERATIONS): string {
  return toHex(pbkdf2(utf8(password), fromHex(salt), iterations, 32));
}

export function isAdminPassword(password: string): boolean {
  if (password.length === 0) return false;
  return sameHex(digestOf(password), DIGEST);
}

/** For the tests: the stored digest's shape, never its preimage. */
export const STORED = { salt: SALT, digest: DIGEST } as const;
