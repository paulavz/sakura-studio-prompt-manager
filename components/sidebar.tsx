"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Item, ItemCategory, CATEGORY_LABELS, CATEGORY_ICONS, WORKSPACE_CATEGORIES } from "@/lib/database.types";
import { NavGroup } from "./nav-group";

// Cherry blossom branch SVG illustration
const CherryBranch = () => (
  <svg viewBox="0 0 180 120" fill="none" xmlns="http://www.w3.org/2000/svg"
    className="w-full max-w-[180px] opacity-60">
    <path d="M10 100 Q40 90 70 70 Q100 50 140 40 Q160 35 175 30"
      stroke="#888" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    <path d="M70 70 Q75 55 85 45" stroke="#888" strokeWidth="1" strokeLinecap="round" fill="none"/>
    <path d="M100 57 Q105 40 115 32" stroke="#888" strokeWidth="1" strokeLinecap="round" fill="none"/>
    <path d="M130 44 Q130 28 138 20" stroke="#888" strokeWidth="1" strokeLinecap="round" fill="none"/>
    <path d="M55 76 Q50 62 55 50" stroke="#888" strokeWidth="0.8" strokeLinecap="round" fill="none"/>
    {[
      [85, 44, 5], [88, 48, 4], [82, 47, 4],
      [115, 31, 5], [119, 34, 4], [112, 34, 4],
      [138, 19, 5], [142, 22, 4], [135, 22, 4],
      [55, 49, 5], [59, 52, 4], [52, 53, 4],
      [40, 83, 4.5], [145, 35, 4], [160, 28, 4],
      [170, 26, 3.5], [105, 55, 3.5]
    ].map(([cx, cy, r], i) => (
      <g key={i} transform={`translate(${cx},${cy})`}>
        {[0,72,144,216,288].map((a, pi) => (
          <ellipse key={pi}
            cx={Math.cos((a-90)*Math.PI/180)*r*0.7}
            cy={Math.sin((a-90)*Math.PI/180)*r*0.7}
            rx={r*0.55} ry={r*0.35}
            transform={`rotate(${a})`}
            fill="var(--color-sakura)" opacity="0.75"
          />
        ))}
        <circle cx="0" cy="0" r="1.2" fill="white" fillOpacity="0.6" />
      </g>
    ))}
    {[
      [95, 65, 12], [108, 72, -8], [72, 85, 15],
      [125, 60, -5], [150, 55, 10]
    ].map(([cx, cy, rot], i) => (
      <ellipse key={`fp${i}`} cx={cx} cy={cy}
        rx="3.5" ry="2.2" transform={`rotate(${rot}, ${cx}, ${cy})`}
        fill="var(--color-sakura)" opacity="0.4" />
    ))}
  </svg>
);

interface SidebarProps {
  items?: Item[];
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  selectedCategory?: ItemCategory | "all" | "favorites";
  onSelectCategory?: (cat: ItemCategory | "all" | "favorites") => void;
  settingsActive?: boolean;
}

export function Sidebar({
  items = [],
  searchQuery = "",
  onSearchChange,
  selectedCategory = "all",
  onSelectCategory,
  settingsActive = false,
}: SidebarProps) {
  const router = useRouter();

  const counts = useMemo(() => {
    const all = items.length;
    const favorites = items.filter((i) => i.is_favorite).length;
    const byCategory: Record<ItemCategory, number> = {
      template: 0, plan: 0, report: 0, output: 0, messaging: 0,
      agente: 0, skill: 0,
    };
    for (const item of items) {
      byCategory[item.category]++;
    }
    return { all, favorites, byCategory };
  }, [items]);

  const handleSearchChange = (q: string) => {
    if (onSearchChange) {
      onSearchChange(q);
    } else {
      router.push("/");
    }
  };

  const handleSelect = (cat: ItemCategory | "all" | "favorites") => {
    if (onSelectCategory) {
      onSelectCategory(cat);
    } else {
      router.push("/");
    }
  };

  const isAllSelected = !settingsActive && selectedCategory === "all";
  const isFavoritesSelected = !settingsActive && selectedCategory === "favorites";

  return (
    <aside data-region="sidebar" className="w-[var(--sidebar-width)] shrink-0 border-r border-gray-200 flex flex-col bg-white overflow-hidden">
      {/* Branding block */}
      <div data-testid="branding-block" className="px-[14px] pt-[16px] pb-[14px] border-b border-gray-200">
        <div className="flex items-center gap-[9px]">
          <div className="w-[26px] h-[26px] rounded-[7px] bg-sakura-soft border border-sakura flex items-center justify-center">
            <span data-testid="branding-emoji" className="text-[15px] leading-none text-sakura">🌸</span>
          </div>
          <div data-testid="branding-text">
            <div data-testid="branding-text-title" className="text-[13px] font-semibold tracking-[-0.01em] leading-tight text-black">Sakura Studio</div>
            <div className="text-[10px] text-gray-400 mt-[1px] leading-tight">Prompt Manager</div>
          </div>
        </div>
      </div>

      {/* Search block */}
      <div className="px-[12px] py-[10px] border-b border-gray-200">
        <div className="flex items-center gap-[7px] bg-gray-50 border border-gray-200 rounded-[var(--radius-sm)] px-[9px] py-[6px]">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11 11L8.5 8.5M10 5.5C10 7.98528 7.98528 10 5.5 10C3.01472 10 1 7.98528 1 5.5C1 3.01472 3.01472 1 5.5 1C7.98528 1 10 3.01472 10 5.5Z" stroke="#A0A0A0" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search…"
            className="bg-transparent border-none outline-none text-[12px] text-black placeholder-gray-400 w-full"
          />
        </div>
      </div>

      {/* Nav */}
      <nav aria-label="Category filters" className="flex-1 overflow-y-auto px-[8px] pt-[8px]">
        <NavGroup label="Home" storageKey="home" defaultOpen={true}>
          <li>
            <button
              onClick={() => handleSelect("all")}
              className={`flex w-full items-center justify-between rounded-[var(--radius-sm)] px-[12px] py-[6px] text-[13px] transition-colors ${
                isAllSelected
                  ? "bg-gray-100 text-black font-medium"
                  : "text-gray-600 hover:bg-gray-50 hover:text-black font-normal"
              }`}
            >
              <div className="flex items-center gap-[8px]">
                <span className={`text-[13px] ${isAllSelected ? "opacity-100" : "opacity-70"}`}>◈</span>
                <span>All Prompts</span>
              </div>
              <span className="text-[10px] font-medium text-gray-400 bg-gray-100 rounded-[10px] px-[6px] py-[1px] min-w-[18px] text-center">
                {counts.all}
              </span>
            </button>
          </li>
          <li>
            <button
              onClick={() => handleSelect("favorites")}
              className={`flex w-full items-center justify-between rounded-[var(--radius-sm)] px-[12px] py-[6px] text-[13px] transition-colors ${
                isFavoritesSelected
                  ? "bg-gray-100 text-black font-medium"
                  : "text-gray-600 hover:bg-gray-50 hover:text-black font-normal"
              }`}
            >
              <div className="flex items-center gap-[8px]">
                <span className={`text-[13px] ${isFavoritesSelected ? "opacity-100" : "opacity-70"}`}>♡</span>
                <span>Favorites</span>
              </div>
              <span className="text-[10px] font-medium text-gray-400 bg-gray-100 rounded-[10px] px-[6px] py-[1px] min-w-[18px] text-center">
                {counts.favorites}
              </span>
            </button>
          </li>
        </NavGroup>

        <NavGroup label="Workspace" storageKey="workspace" defaultOpen={true}>
          {WORKSPACE_CATEGORIES.map((cat) => {
            const isActive = !settingsActive && selectedCategory === cat;
            return (
              <li key={cat}>
                <button
                  onClick={() => handleSelect(cat)}
                  className={`flex w-full items-center justify-between rounded-[var(--radius-sm)] px-[12px] py-[6px] text-[13px] transition-colors ${
                    isActive
                      ? "bg-gray-100 text-black font-medium"
                      : "text-gray-600 hover:bg-gray-50 hover:text-black font-normal"
                  }`}
                >
                  <div className="flex items-center gap-[8px]">
                    <span className={`text-[13px] ${isActive ? "opacity-100" : "opacity-70"}`}>
                      {CATEGORY_ICONS[cat]}
                    </span>
                    <span>{CATEGORY_LABELS[cat]}</span>
                  </div>
                  <span className="text-[10px] font-medium text-gray-400 bg-gray-100 rounded-[10px] px-[6px] py-[1px] min-w-[18px] text-center">
                    {counts.byCategory[cat]}
                  </span>
                </button>
              </li>
            );
          })}
        </NavGroup>

        <NavGroup label="Agents" storageKey="agents" defaultOpen={true}>
          <li>
            <button
              onClick={() => handleSelect("agente")}
              className={`flex w-full items-center justify-between rounded-[var(--radius-sm)] px-[12px] py-[6px] text-[13px] transition-colors ${
                !settingsActive && selectedCategory === "agente"
                  ? "bg-gray-100 text-black font-medium"
                  : "text-gray-600 hover:bg-gray-50 hover:text-black font-normal"
              }`}
            >
              <div className="flex items-center gap-[8px]">
                <span className={`text-[13px] ${!settingsActive && selectedCategory === "agente" ? "opacity-100" : "opacity-70"}`}>{CATEGORY_ICONS.agente}</span>
                <span>All Agents</span>
              </div>
              <span className="text-[10px] font-medium text-gray-400 bg-gray-100 rounded-[10px] px-[6px] py-[1px] min-w-[18px] text-center">
                {counts.byCategory.agente}
              </span>
            </button>
          </li>
        </NavGroup>

        <NavGroup label="Skills" storageKey="skills" defaultOpen={true}>
          <li>
            <button
              onClick={() => handleSelect("skill")}
              className={`flex w-full items-center justify-between rounded-[var(--radius-sm)] px-[12px] py-[6px] text-[13px] transition-colors ${
                !settingsActive && selectedCategory === "skill"
                  ? "bg-gray-100 text-black font-medium"
                  : "text-gray-600 hover:bg-gray-50 hover:text-black font-normal"
              }`}
            >
              <div className="flex items-center gap-[8px]">
                <span className={`text-[13px] ${!settingsActive && selectedCategory === "skill" ? "opacity-100" : "opacity-70"}`}>{CATEGORY_ICONS.skill}</span>
                <span>All Skills</span>
              </div>
              <span className="text-[10px] font-medium text-gray-400 bg-gray-100 rounded-[10px] px-[6px] py-[1px] min-w-[18px] text-center">
                {counts.byCategory.skill}
              </span>
            </button>
          </li>
        </NavGroup>
      </nav>

      {/* Footer */}
      <div className="px-[8px] py-[12px] pb-[8px] border-t border-gray-200 flex flex-col items-center gap-[10px]">
        <Link
          href="/settings/tags"
          className={`w-full flex items-center gap-[8px] rounded-[var(--radius-sm)] px-[10px] py-[6px] text-[13px] transition-colors ${
            settingsActive
              ? "bg-gray-100 text-black font-medium"
              : "text-gray-500 hover:bg-gray-50 hover:text-black"
          }`}
        >
          <span className="text-[13px] opacity-70 shrink-0">⚙</span>
          <span className="flex-1">Settings</span>
        </Link>
        <CherryBranch />
        <div className="flex items-center gap-[6px]">
          <div className="w-[6px] h-[6px] rounded-full bg-sakura shadow-[0_0_6px_var(--color-sakura)]" style={{ animation: 'zen-pulse 2.5s ease-in-out infinite' }}></div>
          <span className="text-[10px] text-gray-400">In flow</span>
        </div>
      </div>

      <style jsx global>{`
        @keyframes zen-pulse {
          0%, 100% { opacity: 0.5; box-shadow: 0 0 4px var(--color-sakura); }
          50% { opacity: 1; box-shadow: 0 0 10px var(--color-sakura); }
        }
      `}</style>
    </aside>
  );
}
