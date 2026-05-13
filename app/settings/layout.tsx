"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/settings/tags", label: "Tags" },
  { href: "/settings/variables", label: "Variables" },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

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
            {NAV.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? "bg-gray-100 text-black font-medium"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
