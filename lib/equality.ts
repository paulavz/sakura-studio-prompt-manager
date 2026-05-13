/**
 * lib/equality.ts
 *
 * Pure helpers for comparing collections without JSON.stringify.
 */

/**
 * Compare two collections as SETS (ignoring duplicates and order).
 *
 * For `[1,1,2]` vs `[1,2,2]` returns `true` because the underlying sets are equal.
 * If exact array equality including duplicates and order is needed, do not use this helper.
 *
 * @param key Optional function to extract a comparable key from objects.
 */
export function arraysEqualUnordered<T>(
  a: T[],
  b: T[],
  key?: (t: T) => string
): boolean {
  if (a.length !== b.length) return false;

  const normalize = key ?? ((t: T) => JSON.stringify(t));
  const setA = new Set(a.map(normalize));
  const setB = new Set(b.map(normalize));

  if (setA.size !== setB.size) return false;

  for (const item of setA) {
    if (!setB.has(item)) return false;
  }

  return true;
}
