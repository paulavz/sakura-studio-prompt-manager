import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { ItemView } from "@/components/item-view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function ItemPage({ params }: PageProps) {
  const { id } = await params;
  
  const admin = createAdminClient();
  
  const { data: item, error } = await admin
    .from("items")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !item) {
    notFound();
  }

  const typedItem = {
    ...item,
    tags: Array.isArray(item.tags) ? (item.tags as string[]) : [],
  };

  return (
    <ItemView
      item={typedItem}
      minVarLength={Number(process.env.MIN_VAR_LENGTH ?? 1)}
      maxVarLength={Number(process.env.MAX_VAR_LENGTH ?? 4000)}
    />
  );
}