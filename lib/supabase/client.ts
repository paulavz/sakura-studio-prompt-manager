import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for Client Components (browser).
 * Call this inside a React component or hook.
 *
 * Usage:
 *   const supabase = createClient();
 *   const { data, error } = await supabase.from("items").select("*");
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
