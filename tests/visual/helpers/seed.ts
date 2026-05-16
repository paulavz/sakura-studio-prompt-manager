/**
 * Seed script for visual regression tests.
 * Creates deterministic items and tags in Supabase so that
 * the gallery and viewer pages have stable content to screenshot.
 * Uses the service-role client to bypass RLS.
 *
 * This runs in Playwright's globalSetup, before any spec.
 * It is idempotent — calling it multiple times will upsert the
 * same items without creating duplicates (uses fixed UUIDs).
 *
 * Exports a globalSetup function compatible with Playwright config.
 * If Supabase env vars are missing (e.g. in CI without secrets),
 * the seed is skipped gracefully.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";
const OWNER_ID = process.env.NEXT_PUBLIC_V1_USER_UUID || "";

const ITEMS = [
  {
    id: "00000000-0000-4000-a000-000000000001",
    title: "Visual Test Template",
    content: "Write a {{task}} plan for {{project}} using best practices.\n\n```ts\nconst config = { debug: true };\n```",
    category: "template",
    tags: ["visual_test", "template_test"],
    is_favorite: false,
  },
  {
    id: "00000000-0000-4000-a000-000000000002",
    title: "Visual Test Plan",
    content: "Step-by-step implementation guide.\n\n## Phase 1\n- Setup repo\n- Add dependencies\n\n```ts\nconst config = { debug: true };\n```",
    category: "plan",
    tags: ["visual_test"],
    is_favorite: true,
  },
  {
    id: "00000000-0000-4000-a000-000000000003",
    title: "Visual Test Agent",
    content: "You are a helpful code review assistant. Focus on security and readability.",
    category: "agente",
    tags: ["visual_test", "code_review"],
    is_favorite: false,
  },
  {
    id: "00000000-0000-4000-a000-000000000004",
    title: "Visual Test Skill",
    content: "A reusable skill for testing the skill injector.",
    category: "skill",
    tags: ["visual_test"],
    is_favorite: false,
  },
];

const TAGS = [
  { id: "00000000-0000-4000-b000-000000000001", slug: "visual_test", label: "Visual Test" },
  { id: "00000000-0000-4000-b000-000000000002", slug: "template_test", label: "Template Test" },
  { id: "00000000-0000-4000-b000-000000000003", slug: "code_review", label: "Code Review" },
];

export async function seed() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const tag of TAGS) {
    const { error } = await supabase
      .from("tags")
      .upsert({ ...tag, owner: OWNER_ID }, { onConflict: "id" });
    if (error) {
      console.error(`Seed: failed to seed tag ${tag.slug}:`, error.message);
    }
  }

  const baseTime = Date.now();
  for (let i = 0; i < ITEMS.length; i++) {
    const item = ITEMS[i];
    const created_at = new Date(baseTime - (ITEMS.length - i) * 60000).toISOString();
    const { error } = await supabase
      .from("items")
      .upsert({ ...item, owner: OWNER_ID, created_at }, { onConflict: "id" });
    if (error) {
      console.error(`Seed: failed to seed item ${item.title}:`, error.message);
    }
  }

  console.log("Seed: visual test data upserted.");
}

export async function cleanup() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const itemIds = ITEMS.map(i => i.id);
  const tagIds = TAGS.map(t => t.id);

  const { error: itemError } = await supabase
    .from("items")
    .delete()
    .in("id", itemIds);

  if (itemError) {
    console.error("Cleanup: failed to delete items:", itemError.message);
  }

  const { error: tagError } = await supabase
    .from("tags")
    .delete()
    .in("id", tagIds);

  if (tagError) {
    console.error("Cleanup: failed to delete tags:", tagError.message);
  }

  console.log("Cleanup: visual test data removed.");
}

export default async function globalSetup() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !OWNER_ID) {
    console.warn(
      "Visual test seed: skipping — missing NEXT_PUBLIC_SUPABASE_URL, " +
        "SUPABASE_SERVICE_ROLE_KEY, or NEXT_PUBLIC_V1_USER_UUID env vars."
    );
    return;
  }
  await seed();
}
