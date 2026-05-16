/**
 * Validates a tag slug.
 * NOTE: this regex is duplicated in three places:
 * 1. lib/tags.ts (this file — client-side validation)
 * 2. supabase/migrations/20260503000001_initial_schema.sql — tags.slug CHECK constraint
 * 3. supabase/migrations/20260507120001_add_tag_rpc_functions.sql — rename_tag RPC validation
 * If the rule changes, update all three locations.
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(slug);
}