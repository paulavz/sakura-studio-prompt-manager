export function isValidSlug(slug: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(slug);
}