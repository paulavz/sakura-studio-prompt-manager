/**
 * lib/equality.ts
 *
 * Pure helpers for comparing collections without JSON.stringify.
 */

export function arraysEqualUnordered<T>(
  a: T[],
  b: T[],
  key?: (t: T) => string
): boolean {
  if (a.length !== b.length) return false;

  if (!key) {
    // Fast path for primitives (string, number, boolean): native Set equality by value.
    // For object arrays, always provide a key extractor.
    const setA = new Set(a);
    const setB = new Set(b);
    if (setA.size !== setB.size) return false;
    for (const item of setA) if (!setB.has(item)) return false;
    return true;
  }

  const setA = new Set(a.map(key));
  const setB = new Set(b.map(key));
  if (setA.size !== setB.size) return false;
  for (const item of setA) if (!setB.has(item)) return false;
  return true;
}
