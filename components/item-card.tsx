"use client";

import { Item, ItemCategory } from "@/lib/database.types";
import { hasVariables } from "@/lib/variables";

interface ItemCardProps {
  item: Item;
  onSelect?: (item: Item) => void;
  isSelected?: boolean;
}

const CATEGORY_BG: Record<ItemCategory, string> = {
  template: "var(--color-tag-blue)",
  agente: "var(--color-tag-green)",
  skill: "var(--color-tag-orange)",
};

export function ItemCard({ item, onSelect, isSelected }: ItemCardProps) {
  const hasVars = hasVariables(item.content);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const cardContent = (
    <div className="relative">
      {/* Sakura glow overlay on active */}
      {isSelected && (
        <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--color-sakura-6)_0%,transparent_60%)] rounded-[8px] pointer-events-none" />
      )}

      {/* Top row: title + icons */}
      <div className="flex items-center gap-[6px] mb-[8px]">
        <h3 className="flex-1 text-[13.5px] font-semibold text-black tracking-[-0.01em] line-height-[1.35] text-left">
          {item.title}
        </h3>
        {hasVars && (
          <span data-testid="variable-indicator" className="text-[13px] shrink-0 flex items-center" aria-label="Contains variables">
            🌸
          </span>
        )}
        <button
          className={`shrink-0 text-[14px] flex items-center transition-all ${
            item.is_favorite ? "text-sakura [filter:drop-shadow(0_0_3px_var(--color-sakura))]" : "text-gray-300"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            // Toggle favorite logic would go here, but for Phase 9 we just render
          }}
        >
          {item.is_favorite ? "♥" : "♡"}
        </button>
      </div>

      {/* Tags row */}
      <div className="flex flex-wrap gap-[4px] mb-[10px]">
        {item.tags.map((tag) => (
          <span
            key={tag}
            data-testid="tag-chip"
            className={`text-[10px] font-medium rounded-[4px] px-[6px] py-[2px] font-mono whitespace-nowrap border ${
              hasVars
                ? "text-variable-text bg-[var(--color-sakura-18)] border-sakura/30"
                : "text-tag-chip-text bg-tag-chip-bg border-tag-chip-border"
            }`}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Bottom row: category + date */}
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] font-medium text-gray-600 border border-gray-200 rounded-[4px] px-[7px] py-[2px] whitespace-nowrap"
          style={{ backgroundColor: CATEGORY_BG[item.category] }}
        >
          {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
        </span>
        <span className="text-[10px] text-gray-400 font-mono">
          {formatDate(item.created_at)}
        </span>
      </div>
    </div>
  );

  const baseClasses = `group block w-full rounded-[8px] transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)] p-[14px_16px] relative cursor-pointer ${
    isSelected
      ? "bg-white border-transparent shadow-[0_0_0_2px_var(--color-sakura),0_4px_20px_var(--color-sakura-glow)]"
      : "bg-white border border-gray-200 hover:border-transparent hover:shadow-[0_0_0_1px_var(--color-sakura),0_8px_24px_var(--color-sakura-glow),0_2px_8px_rgba(0,0,0,0.06)] hover:-translate-y-[2px]"
  }`;

  return (
    <div
      data-testid="item-card"
      data-has-variable={hasVars ? "true" : "false"}
      onClick={onSelect ? () => onSelect(item) : undefined}
      onKeyDown={onSelect ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(item);
        }
      } : undefined}
      tabIndex={onSelect ? 0 : undefined}
      role={onSelect ? "button" : undefined}
      className={baseClasses}
    >
      {cardContent}
    </div>
  );
}
