/**
 * Test-only ESM resolver hook.
 *
 * App code imports siblings the idiomatic way (`../util/random`), which Metro
 * and TypeScript both resolve. Node's ESM resolver requires an explicit
 * extension, so this hook retries a failed resolution with the TypeScript
 * extensions before giving up. It exists so the source can stay conventional
 * while still being unit-testable with no test framework or build step.
 */

const EXTENSIONS = ['.ts', '.tsx', '/index.ts', '/index.tsx'];

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (!specifier.startsWith('.')) throw error;

    for (const extension of EXTENSIONS) {
      try {
        return await nextResolve(specifier + extension, context);
      } catch {
        // Try the next candidate.
      }
    }
    throw error;
  }
}
