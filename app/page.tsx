import { createAdminClient } from "@/lib/supabase/admin";
import { Gallery } from "@/components/gallery";
import { Item } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // v1: usamos admin client porque aún no hay UI de login (Fase 10).
  // En v2, con NEXT_PUBLIC_AUTH_ENABLED=true, esto migrará al cliente
  // de sesión (lib/supabase/server.ts) para respetar RLS vía auth.uid().
  const admin = createAdminClient();

  const { data: items, error } = await admin
    .from("items")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching items:", error.message);
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <h1 className="text-xl font-semibold">Error al cargar items</h1>
        <p className="text-sm text-gray-500">{error.message}</p>
      </main>
    );
  }

  // Supabase devuelve jsonb como unknown; casteamos tags a string[].
  const typedItems: Item[] = (items ?? []).map((row) => ({
    ...(row as Omit<Item, "tags">),
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
  }));

  return <Gallery items={typedItems} minVarLength={Number(process.env.MIN_VAR_LENGTH ?? 1)} maxVarLength={Number(process.env.MAX_VAR_LENGTH ?? 4000)} />;
}
