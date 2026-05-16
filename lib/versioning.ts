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

  const { data, error } = await admin.rpc("save_item_with_version", {
    p_item_id: itemId,
    p_owner: ownerId,
    p_title: title,
    p_content: content,
    p_category: category,
    p_tags: tags,
    p_applied_skills: appliedSkills,
    p_is_favorite: isFavorite,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const result = data as { success: boolean; content: string; error?: string } | null;

  if (!result || !result.success) {
    return { success: false, error: result?.error || "Unknown save error" };
  }

  return { success: true, content: result.content };
}
