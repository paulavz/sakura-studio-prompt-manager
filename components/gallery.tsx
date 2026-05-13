"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Item, ItemCategory, CATEGORY_LABELS, CATEGORIES } from "@/lib/database.types";
import { ItemCard } from "./item-card";
import { ItemView } from "./item-view";

interface GalleryProps {
  items: Item[];
  minVarLength?: number;
  maxVarLength?: number;
}

// Cherry blossom branch SVG illustration
const CherryBranch = () => (
  <svg viewBox="0 0 180 120" fill="none" xmlns="http://www.w3.org/2000/svg"
    className="w-full max-w-[180px] opacity-60">
    {/* Main branch */}
    <path d="M10 100 Q40 90 70 70 Q100 50 140 40 Q160 35 175 30"
      stroke="#888" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    {/* Sub branches */}
    <path d="M70 70 Q75 55 85 45" stroke="#888" strokeWidth="1" strokeLinecap="round" fill="none"/>
    <path d="M100 57 Q105 40 115 32" stroke="#888" strokeWidth="1" strokeLinecap="round" fill="none"/>
    <path d="M130 44 Q130 28 138 20" stroke="#888" strokeWidth="1" strokeLinecap="round" fill="none"/>
    <path d="M55 76 Q50 62 55 50" stroke="#888" strokeWidth="0.8" strokeLinecap="round" fill="none"/>
    {/* Blossoms - main branch */}
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
    {/* Falling petals */}
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

export function Gallery({ items, minVarLength = 1, maxVarLength = 4000 }: GalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | "all" | "favorites">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedCategory === "favorites" && !item.is_favorite) {
        return false;
      }
      if (selectedCategory !== "all" && selectedCategory !== "favorites" && item.category !== selectedCategory) {
        return false;
      }
      if (normalizedQuery && !item.title.toLowerCase().includes(normalizedQuery)) {
        return false;
      }
      return true;
    });
  }, [items, selectedCategory, normalizedQuery]);

  const selectedItem = useMemo(() => {
    if (selectedItemId) {
      const found = items.find((i) => i.id === selectedItemId);
      if (found) return found;
    }
    return filteredItems.length > 0 ? filteredItems[0] : null;
  }, [selectedItemId, items, filteredItems]);

  const categoryCounts = useMemo(() => {
    const counts: Record<ItemCategory | "all" | "favorites", number> = {
      all: items.length,
      favorites: items.filter(i => i.is_favorite).length,
      template: 0,
      plan: 0,
      data_output: 0,
      agente: 0,
      skill: 0,
    };
    for (const item of items) {
      counts[item.category]++;
    }
    return counts;
  }, [items]);

  const filterLabel = useMemo(() => {
    if (selectedCategory === "all") return "All Prompts";
    if (selectedCategory === "favorites") return "Favorites";
    return CATEGORY_LABELS[selectedCategory as ItemCategory];
  }, [selectedCategory]);

  return (
    <div data-region="layout-root" className="flex h-screen overflow-hidden bg-white">
      {/* Sidebar */}
      <aside data-region="sidebar" className="w-[var(--sidebar-width)] shrink-0 border-r border-gray-200 flex flex-col bg-white overflow-hidden">
        {/* Branding block */}
        <div data-testid="branding-block" className="px-[14px] pt-[16px] pb-[14px] border-b border-gray-200">
          <div className="flex items-center gap-[9px]">
            <div className="w-[26px] h-[26px] rounded-[7px] bg-sakura-soft border border-sakura flex items-center justify-center">
              <span data-testid="branding-emoji" className="text-[15px] leading-none text-sakura">🌸</span>
            </div>
            <div data-testid="branding-text">
              <div data-testid="branding-text-title" className="text-[13px] font-semibold tracking-[-0.01em] leading-tight text-sakura">Sakura Studio</div>
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
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search…"
              className="bg-transparent border-none outline-none text-[12px] text-black placeholder-gray-400 w-full"
            />
          </div>
        </div>

        {/* Nav */}
        <nav aria-label="Category filters" className="flex-1 overflow-y-auto px-[8px] pt-[8px]">
          <div className="mb-4">
            <div className="px-[12px] py-[5px] text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em] flex items-center justify-between">
              <span>Home</span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="transition-transform rotate-0">
                <path d="M3 2L6 5L3 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <ul className="space-y-[1px]">
              <li>
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`flex w-full items-center justify-between rounded-[var(--radius-sm)] px-[12px] py-[6px] text-[13px] transition-colors ${
                    selectedCategory === "all"
                      ? "bg-gray-100 text-black font-medium"
                      : "text-gray-600 hover:bg-gray-50 hover:text-black font-normal"
                  }`}
                >
                  <div className="flex items-center gap-[8px]">
                    <span className={`text-[13px] ${selectedCategory === "all" ? "opacity-100" : "opacity-70"}`}>◈</span>
                    <span>All Prompts</span>
                  </div>
                  <span className="text-[10px] font-medium text-gray-400 bg-gray-100 rounded-[10px] px-[6px] py-[1px] min-w-[18px] text-center">
                    {categoryCounts.all}
                  </span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setSelectedCategory("favorites")}
                  className={`flex w-full items-center justify-between rounded-[var(--radius-sm)] px-[12px] py-[6px] text-[13px] transition-colors ${
                    selectedCategory === "favorites"
                      ? "bg-gray-100 text-black font-medium"
                      : "text-gray-600 hover:bg-gray-50 hover:text-black font-normal"
                  }`}
                >
                  <div className="flex items-center gap-[8px]">
                    <span className={`text-[13px] ${selectedCategory === "favorites" ? "opacity-100" : "opacity-70"}`}>♡</span>
                    <span>Favorites</span>
                  </div>
                  <span className="text-[10px] font-medium text-gray-400 bg-gray-100 rounded-[10px] px-[6px] py-[1px] min-w-[18px] text-center">
                    {categoryCounts.favorites}
                  </span>
                </button>
              </li>
            </ul>
          </div>

          <div className="mb-4">
            <div className="px-[12px] py-[5px] text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em] flex items-center justify-between">
              <span>Categories</span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="transition-transform rotate-0">
                <path d="M3 2L6 5L3 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <ul className="space-y-[1px]">
              {CATEGORIES.map((cat) => (
                <li key={cat}>
                  <button
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex w-full items-center justify-between rounded-[var(--radius-sm)] px-[12px] py-[6px] text-[13px] transition-colors ${
                      selectedCategory === cat
                        ? "bg-gray-100 text-black font-medium"
                        : "text-gray-600 hover:bg-gray-50 hover:text-black font-normal"
                    }`}
                  >
                    <div className="flex items-center gap-[8px]">
                      <span className={`text-[13px] ${selectedCategory === cat ? "opacity-100" : "opacity-70"}`}>
                        {cat === 'template' ? '▦' : cat === 'plan' ? '◎' : cat === 'agente' ? '⌥' : cat === 'skill' ? '✦' : '⬡'}
                      </span>
                      <span>{CATEGORY_LABELS[cat]}</span>
                    </div>
                    <span className="text-[10px] font-medium text-gray-400 bg-gray-100 rounded-[10px] px-[6px] py-[1px] min-w-[18px] text-center">
                      {categoryCounts[cat]}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-2">
            <Link
              href="/settings/tags"
              className="flex items-center gap-[8px] rounded-[var(--radius-sm)] px-[12px] py-[6px] text-[13px] text-gray-600 hover:bg-gray-50 hover:text-black transition-colors"
            >
              <span className="text-[13px] opacity-70">⚙</span>
              <span>Settings</span>
            </Link>
          </div>
        </nav>

        {/* Footer */}
        <div className="px-[8px] py-[12px] pb-[8px] border-t border-gray-200 flex flex-col items-center gap-[10px]">
          <CherryBranch />
          <div className="flex items-center gap-[6px]">
            <div className="w-[6px] h-[6px] rounded-full bg-sakura shadow-[0_0_6px_var(--color-sakura)]" style={{ animation: 'zen-pulse 2.5s ease-in-out infinite' }}></div>
            <span className="text-[10px] text-gray-400">In flow</span>
          </div>
        </div>
      </aside>

      {/* Gallery */}
      <main data-region="gallery" className="w-[var(--gallery-width)] shrink-0 border-r border-gray-200 grid grid-rows-[auto_1fr] bg-white overflow-hidden">
        {/* Header */}
        <div className="px-[16px] pt-[14px] pb-[12px] border-b border-gray-200 flex items-center justify-between">
          <div>
            <div className="text-[14px] font-semibold tracking-[-0.01em] text-black">{filterLabel}</div>
            <div className="flex items-center gap-[8px] mt-[3px]">
              <span className="text-[11px] text-gray-400">
                {filteredItems.length} prompt{filteredItems.length !== 1 ? 's' : ''}
              </span>
              <span className="inline-flex items-center gap-[3px] text-[10px] text-variable-text bg-sakura-soft border border-sakura/30 rounded-[4px] px-[6px] py-[2px] leading-none">
                <span className="leading-none">🌸</span>
                <span>with variables</span>
              </span>
            </div>
          </div>
          <Link
            href="/items/new"
            className="w-[28px] h-[28px] rounded-[var(--radius-sm)] border border-gray-200 flex items-center justify-center text-[13px] text-gray-400 hover:bg-gray-50 hover:text-black transition-all"
            title="New prompt"
          >
            +
          </Link>
        </div>

        {/* Card List */}
        <div className="flex-1 overflow-y-auto px-[12px] py-[10px] flex flex-col gap-[6px]">
          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-[8px] text-gray-400">
              <div className="text-[28px] opacity-40">🌸</div>
              <div className="text-[12px]">No items yet.</div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-[8px] text-gray-400">
              <div className="text-[28px] opacity-40">🌸</div>
              <div className="text-[12px]">No prompts found</div>
            </div>
          ) : (
            filteredItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onSelect={(item) => setSelectedItemId(item.id)}
                isSelected={selectedItem?.id === item.id}
              />
            ))
          )}
        </div>
      </main>

      {/* Viewer */}
      <div data-region="viewer" className="flex-1 overflow-y-auto bg-white">
        {selectedItem ? (
          <ItemView
            key={selectedItem.id}
            item={selectedItem}
            minVarLength={minVarLength}
            maxVarLength={maxVarLength}
            embedded={true}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400 text-sm">
            Select an item to view
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes zen-pulse {
          0%, 100% { opacity: 0.5; box-shadow: 0 0 4px var(--color-sakura); }
          50% { opacity: 1; box-shadow: 0 0 10px var(--color-sakura); }
        }
      `}</style>
    </div>
  );
}
