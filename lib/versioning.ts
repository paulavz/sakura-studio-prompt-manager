import { createAdminClient } from "@/lib/supabase/admin";
import { ItemCategory } from "@/lib/database.types";

export async function saveItemComplete(
  itemId: string,
  content: string,
  title: string,
  category: ItemCategory,
  tags: string[],
  appliedSkills: { id: string; name: string }[],
  isFavorite: boolean,
  ownerId: string
): Promise<{ success: boolean; content?: string; error?: string }> {
  const admin = createAdminClient();

  // Update item with all fields atomically
  const { error: updateError } = await admin
    .from("items")
    .update({
      title,
      content,
      category,
      tags,
      applied_skills: appliedSkills,
      is_favorite: isFavorite,
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .eq("owner", ownerId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Insert version snapshot (full item state)
  const { error: insertError } = await admin
    .from("versions")
    .insert({
      item_id: itemId,
      content_snapshot: content,
      applied_skills_snapshot: appliedSkills,
    });

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  // Rotate old versions silently
  try {
    await admin.rpc("rotate_versions", { p_item_id: itemId });
  } catch (e) {
    console.warn("Version rotation failed:", e);
  }

  return { success: true, content };
}