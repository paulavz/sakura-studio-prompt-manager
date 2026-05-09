"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { ItemCategory } from "@/lib/database.types";
import { isValidSlug } from "@/lib/tags";
import { saveItemComplete } from "@/lib/versioning";
import { DEFAULT_OWNER } from "@/lib/env";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const CATEGORIES: ItemCategory[] = [
  "template",
  "plan",
  "data_output",
  "agente",
  "skill",
];

function isValidCategory(value: string): value is ItemCategory {
  return (CATEGORIES as string[]).includes(value);
}

export async function createItemAction(
  _prev: unknown,
  formData: FormData
): Promise<{ error?: string }> {
  const title = formData.get("title") as string;
  const category = formData.get("category") as string;

  if (!title || !title.trim()) {
    return { error: "Title is required." };
  }

  if (!isValidCategory(category)) {
    return { error: "Invalid category." };
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("items")
    .insert({
      title: title.trim(),
      category,
      content: "",
      tags: [],
      is_favorite: false,
      owner: DEFAULT_OWNER,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  redirect(`/items/${data.id}`);
}

export async function saveItem(
  id: string,
  content: string,
  title: string,
  category: ItemCategory,
  tags: string[],
  appliedSkills: { id: string; name: string }[],
  isFavorite: boolean,
  ownerId: string = DEFAULT_OWNER
): Promise<{ success: boolean; content?: string; error?: string }> {
  const result = await saveItemComplete(
    id,
    content,
    title,
    category,
    tags,
    appliedSkills,
    isFavorite,
    ownerId
  );

  if (result.success) {
    revalidatePath(`/items/${id}`);
    revalidatePath("/");
  }

  return result;
}

export async function getTags(ownerId: string = DEFAULT_OWNER): Promise<string[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("tags")
    .select("slug")
    .eq("owner", ownerId)
    .order("slug");

  if (error) {
    console.warn("Failed to fetch tags:", error.message);
    return [];
  }

  return data.map((t) => t.slug);
}

export async function createTag(
  slug: string,
  ownerId: string = DEFAULT_OWNER
): Promise<{ success: boolean; slug?: string; error?: string }> {
  if (!isValidSlug(slug)) {
    return { success: false, error: "Invalid slug format" };
  }

  const admin = createAdminClient();

  const { error } = await admin.from("tags").insert({
    slug,
    owner: ownerId,
  });

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Tag already exists" };
    }
    if (error.code === "23514") {
      return { success: false, error: "Invalid slug format" };
    }
    return { success: false, error: "Failed to create tag" };
  }

  return { success: true, slug };
}

export async function getItemVersions(
  itemId: string
): Promise<{ id: string; content_snapshot: string; applied_skills_snapshot: { id: string; name: string }[]; created_at: string }[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("versions")
    .select("id, content_snapshot, applied_skills_snapshot, created_at")
    .eq("item_id", itemId)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Failed to fetch versions:", error.message);
    return [];
  }

  return data;
}

export async function getSkills(
  ownerId: string = DEFAULT_OWNER
): Promise<{ id: string; title: string }[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("items")
    .select("id, title")
    .eq("owner", ownerId)
    .eq("category", "skill")
    .neq("title", "")
    .order("title");

  if (error) {
    console.warn("Failed to fetch skills:", error.message);
    return [];
  }

  return data;
}

export async function getTagsWithUsage(
  ownerId: string = DEFAULT_OWNER
): Promise<{ id: string; slug: string; usage_count: number }[]> {
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("get_tags_with_usage", {
    p_owner_id: ownerId,
  });

  if (error) {
    console.warn("Failed to fetch tags:", error.message);
    return [];
  }

  if (!data) return [];

  return data.map((row: { id: string; slug: string; usage_count: number }) => ({
    id: row.id,
    slug: row.slug,
    usage_count: row.usage_count,
  }));
}

export async function deleteTag(
  id: string,
  ownerId: string = DEFAULT_OWNER
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();

  const { error } = await admin.rpc("delete_tag_safe", {
    p_tag_id: id,
    p_owner_id: ownerId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/settings/tags");
  return { success: true };
}

export async function renameTag(
  id: string,
  newSlug: string,
  ownerId: string = DEFAULT_OWNER
): Promise<{ success: boolean; error?: string }> {
  const slug = newSlug.trim();

  if (!isValidSlug(slug)) {
    return { success: false, error: "Invalid slug format" };
  }

  const admin = createAdminClient();

  const { data, error } = await admin.rpc("rename_tag", {
    p_tag_id: id,
    p_new_slug: slug,
    p_owner_id: ownerId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // NOTE: one revalidatePath per affected item. Acceptable for v1 with few items.
  // v2 may switch to revalidateTag for a single global items tag.
  if (Array.isArray(data)) {
    for (const row of data) {
      revalidatePath(`/items/${row.affected_item_id}`);
    }
  }

  revalidatePath("/settings/tags");
  revalidatePath("/");
  return { success: true };
}

export async function getAgents(
  ownerId: string = DEFAULT_OWNER
): Promise<{ id: string; title: string }[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("items")
    .select("id, title")
    .eq("owner", ownerId)
    .eq("category", "agente")
    .neq("title", "")
    .order("title");

  if (error) {
    console.warn("Failed to fetch agents:", error.message);
    return [];
  }

  return data;
}