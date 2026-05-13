import Link from "next/link";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight text-black">
          Sakura Prompt Studio
        </h1>
        <Link
          href="/"
          className="text-sm text-gray-600 hover:text-black transition-colors"
        >
          ← Back to gallery
        </Link>
      </header>
      <div className="flex">
        <nav className="w-48 border-r border-gray-200 p-4">
          <ul className="space-y-2">
            <li>
              <Link
                href="/settings/tags"
                className="block rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Tags
              </Link>
            </li>
          </ul>
        </nav>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
