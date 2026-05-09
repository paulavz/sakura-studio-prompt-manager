"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Item, ItemCategory, CATEGORY_LABELS, CATEGORIES } from "@/lib/database.types";
import { ItemCard } from "./item-card";
import { ItemView } from "./item-view";

interface GalleryProps {
  items: Item[];
  minVarLength?: number;
  maxVarLength?: number;
}

export function Gallery({ items, minVarLength = 1, maxVarLength = 4000 }: GalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }
      if (normalizedQuery && !item.title.toLowerCase().includes(normalizedQuery)) {
        return false;
      }
      if (onlyFavorites && !item.is_favorite) {
        return false;
      }
      return true;
    });
  }, [items, selectedCategory, normalizedQuery, onlyFavorites]);

  useEffect(() => {
    if (!selectedItem && filteredItems.length > 0) {
      setSelectedItem(filteredItems[0]);
    }
  }, [filteredItems, selectedItem]);

  const categoryCounts = useMemo(() => {
    const counts: Record<ItemCategory | "all", number> = {
      all: items.length,
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

  return (
    <div data-region="layout-root" className="flex h-screen overflow-hidden bg-white">
      {/* Sidebar */}
      <aside data-region="sidebar" className="w-[200px] shrink-0 border-r border-gray-line overflow-y-auto bg-gray-surface">
        <div data-testid="branding-block" className="px-4 py-4 border-b border-gray-line">
          <div className="flex items-center gap-2">
            <span data-testid="branding-emoji" className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-sakura/40 border border-sakura text-sakura text-sm">
              🌸
            </span>
            <span data-testid="branding-text" className="text-sm font-semibold text-sakura tracking-tight">Sakura</span>
          </div>
        </div>

        <nav aria-label="Category filters" className="px-3 pb-4 pt-2">
          <ul className="space-y-1">
            <li>
              <button
                onClick={() => setSelectedCategory("all")}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                  selectedCategory === "all"
                    ? "bg-gray-200 text-black"
                    : "text-gray-600 hover:bg-gray-100 hover:text-black"
                }`}
              >
                <span>All</span>
                <span className="text-xs text-gray-400">{categoryCounts.all}</span>
              </button>
            </li>
            {CATEGORIES.map((cat) => (
              <li key={cat}>
                <button
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                    selectedCategory === cat
                      ? "bg-gray-200 text-black"
                      : "text-gray-600 hover:bg-gray-100 hover:text-black"
                  }`}
                >
                  <span>{CATEGORY_LABELS[cat]}</span>
                  <span className="text-xs text-gray-400">{categoryCounts[cat]}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Gallery */}
      <main data-region="gallery" className="w-[340px] shrink-0 border-r border-gray-line overflow-y-auto bg-white grid grid-cols-1 gap-4 p-4 content-start">
        {/* Toolbar */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-line px-4 py-3 flex flex-col gap-3">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title…"
              className="w-full rounded-md border border-gray-line bg-white px-3 py-2 text-sm text-black placeholder-gray-400 outline-none transition-colors focus:border-gray-400"
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={onlyFavorites}
                onChange={(e) => setOnlyFavorites(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-black accent-black"
              />
              Favorites only
            </label>
            <Link
              href="/items/new"
              className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 transition-colors"
            >
              + New
            </Link>
          </div>
        </div>

        {/* Card List */}
        <div className="flex flex-col gap-3 p-4">
          {items.length === 0 ? (
            <p className="text-sm text-gray-500">No items yet.</p>
          ) : filteredItems.length === 0 ? (
            <p className="text-sm text-gray-500">No items found.</p>
          ) : (
            filteredItems.map((item) => (
              <div key={item.id} data-testid="item-card">
                <ItemCard item={item} onSelect={setSelectedItem} isSelected={selectedItem?.id === item.id} />
              </div>
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
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400 text-sm">
            Select an item to view
          </div>
        )}
      </div>
    </div>
  );
}
