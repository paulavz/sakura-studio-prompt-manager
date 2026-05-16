"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Item, ItemCategory, CATEGORY_LABELS, CATEGORIES } from "@/lib/database.types";
import { ItemCard } from "./item-card";
import { ItemView } from "./item-view";
import { Sidebar } from "./sidebar";

interface GalleryProps {
  items: Item[];
  minVarLength?: number;
  maxVarLength?: number;
}

export function Gallery({ items, minVarLength = 1, maxVarLength = 4000 }: GalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | "all" | "favorites">("all");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
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
      if (selectedSubcategory && item.subcategory !== selectedSubcategory) {
        return false;
      }
      if (normalizedQuery && !item.title.toLowerCase().includes(normalizedQuery)) {
        return false;
      }
      return true;
    });
  }, [items, selectedCategory, selectedSubcategory, normalizedQuery]);

  const selectedItem = useMemo(() => {
    if (selectedItemId) {
      const found = items.find((i) => i.id === selectedItemId);
      if (found) return found;
    }
    return filteredItems.length > 0 ? filteredItems[0] : null;
  }, [selectedItemId, items, filteredItems]);

  const filterLabel = useMemo(() => {
    if (selectedCategory === "all") return "All Prompts";
    if (selectedCategory === "favorites") return "Favorites";
    if (selectedSubcategory) return selectedSubcategory;
    return CATEGORY_LABELS[selectedCategory as ItemCategory];
  }, [selectedCategory, selectedSubcategory]);

  const handleSelectCategory = (cat: ItemCategory | "all" | "favorites", subcategory?: string | null) => {
    setSelectedCategory(cat);
    setSelectedSubcategory(subcategory ?? null);
    setSelectedItemId(null);
  };

  return (
    <div data-region="layout-root" className="flex h-screen overflow-hidden bg-white">
      {/* Sidebar */}
      <Sidebar
        items={items}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        selectedSubcategory={selectedSubcategory}
        onSelectCategory={handleSelectCategory}
      />

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
