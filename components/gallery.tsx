"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Item, ItemCategory, CATEGORY_LABELS, CATEGORIES } from "@/lib/database.types";
import { ItemCard } from "./item-card";

interface GalleryProps {
  items: Item[];
}

export function Gallery({ items }: GalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);

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
    <div className="flex min-h-screen flex-col gap-8 p-8 lg:flex-row">
      {/* Sidebar */}
      <aside className="shrink-0 lg:w-48">
        <nav aria-label="Category filters">
          <ul className="space-y-1">
            <li>
              <button
                onClick={() => setSelectedCategory("all")}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  selectedCategory === "all"
                    ? "bg-gray-100 text-black"
                    : "text-gray-600 hover:bg-gray-50 hover:text-black"
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
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    selectedCategory === cat
                      ? "bg-gray-100 text-black"
                      : "text-gray-600 hover:bg-gray-50 hover:text-black"
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

      {/* Main content */}
      <main className="flex-1">
        {/* Toolbar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <label htmlFor="search" className="sr-only">
              Search by title
            </label>
            <input
              id="search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title…"
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-black placeholder-gray-400 outline-none transition-colors focus:border-gray-400"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-600">
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
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
            >
              + New item
            </Link>
          </div>
        </div>

        {/* Grid */}
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">
            No items yet. Insert seeds from the Supabase SQL Editor
            (see <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs">supabase/seed.sql</code>).
          </p>
        ) : filteredItems.length === 0 ? (
          <p className="text-sm text-gray-500">
            No items found for the selected filters.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item) => (
              <li key={item.id}>
                <ItemCard item={item} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
