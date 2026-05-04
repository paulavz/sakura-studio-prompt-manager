import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function SmokeTestPage() {
  const admin = createAdminClient();

  let itemCount: number | null = null;
  let errorMessage: string | null = null;

  try {
    const { count, error } = await admin
      .from("items")
      .select("*", { count: "exact", head: true });

    if (error) {
      errorMessage = error.message;
    } else {
      itemCount = count ?? 0;
    }
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : String(e);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-xl font-semibold">Supabase — Smoke Test</h1>

      {errorMessage ? (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <strong>Error:</strong> {errorMessage}
          <p className="mt-1 text-xs text-red-500">
            Verifica que las variables de entorno Supabase estén configuradas en
            .env.local y que las migraciones se hayan aplicado.
          </p>
        </div>
      ) : (
        <div className="rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Conexión exitosa — {itemCount} item
          {itemCount !== 1 ? "s" : ""} en la base de datos.
        </div>
      )}

      <p className="text-xs text-gray-500">
        URL:{" "}
        <code className="font-mono">{process.env.NEXT_PUBLIC_SUPABASE_URL}</code>
      </p>
    </main>
  );
}
