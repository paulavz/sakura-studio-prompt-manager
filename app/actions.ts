"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { ItemCategory } from "@/lib/database.types";
import { isValidSlug } from "@/lib/tags";
import { saveItemComplete } from "@/lib/versioning";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const DEFAULT_OWNER = process.env.NEXT_PUBLIC_V1_USER_UUID || "";

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
  label: string,
  ownerId: string = DEFAULT_OWNER
): Promise<{ success: boolean; slug?: string; error?: string }> {
  const slug = label
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/^[0-9]/, "tag_$&");

  if (!isValidSlug(slug)) {
    return { success: false, error: "Invalid slug format" };
  }

  const admin = createAdminClient();

  const { error } = await admin.from("tags").insert({
    slug,
    label,
    owner: ownerId,
  });

  if (error && !error.message.includes("duplicate")) {
    return { success: false, error: error.message };
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