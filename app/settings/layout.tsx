"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";

const SETTINGS_NAV = [
  { href: "/settings/tags", label: "Tags", icon: "#" },
  { href: "/settings/variables", label: "Variables Drawer", icon: "🌸" },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar settingsActive={true} />

      <div className="flex-1 flex overflow-hidden bg-white">
        {/* Settings subnav — lateral sidebar per mockup m14-m17 */}
        <aside className="w-[200px] shrink-0 border-r border-gray-200 flex flex-col py-5 px-3">
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.08em] px-[10px] pb-[10px]">
            Settings
          </div>
          <nav aria-label="Settings sections">
            <ul className="space-y-[1px]">
              {SETTINGS_NAV.map((item) => {
                const isActive = item.href ? pathname === item.href : false;
                return (
                  <li key={item.label}>
                    {item.href ? (
                      <Link
                        href={item.href}
                        className={`flex items-center gap-[8px] rounded-[var(--radius-sm)] px-[10px] py-[7px] text-[13px] transition-colors ${
                          isActive
                            ? "bg-gray-100 text-black font-medium"
                            : "text-gray-700 hover:bg-gray-50 hover:text-black font-normal"
                        }`}
                      >
                        <span className="w-4 text-center text-[12px]">
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </Link>
                    ) : (
                      <div className="flex items-center justify-between rounded-[var(--radius-sm)] px-[10px] py-[7px] text-[13px] text-gray-400 cursor-not-allowed">
                        <div className="flex items-center gap-[8px]">
                          <span className="w-4 text-center text-[12px] opacity-50">
                            {item.icon}
                          </span>
                          <span>{item.label}</span>
                        </div>
                        <span className="text-[9px] text-gray-300">soon</span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto px-7 py-6">
          {children}
        </div>
      </div>
    </div>
  );
}
