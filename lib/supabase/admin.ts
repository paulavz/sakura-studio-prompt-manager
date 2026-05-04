import { createClient } from "@supabase/supabase-js";

/**
 * Admin client — server-only, uses the service role key.
 * Bypasses RLS. Use sparingly and only in trusted server contexts
 * (Server Actions, Route Handlers, Server Components for admin tasks).
 *
 * NEVER import this into a Client Component or expose the key.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
