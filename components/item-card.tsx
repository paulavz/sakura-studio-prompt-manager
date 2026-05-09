"use client";

import Link from "next/link";
import { Item } from "@/lib/database.types";
import { hasVariables } from "@/lib/variables";

interface ItemCardProps {
  item: Item;
  onSelect?: (item: Item) => void;
  isSelected?: boolean;
}

export function ItemCard({ item, onSelect, isSelected }: ItemCardProps) {
  const hasVars = hasVariables(item.content);

  const cardContent = (
    <>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-black">
          {item.title}
        </h3>
        {hasVars && (
          <span className="shrink-0 text-sm" aria-label="Contains variables">
            🌸
          </span>
        )}
      </div>

      {item.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {item.tags.map((tag) => (
            <span
              key={tag}
              data-testid="tag-chip"
              className="inline-flex items-center rounded-sm border border-gray-line bg-gray-surface px-2 py-0.5 text-xs text-gray-600"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </>
  );

  const baseClasses = `group block w-full rounded-md border transition-colors p-3 ${
    isSelected ? "border-sakura border-[1.5px]" : "border-gray-line"
  }`;

  if (onSelect) {
    return (
      <button
        onClick={() => onSelect(item)}
        className={baseClasses}
      >
        {cardContent}
      </button>
    );
  }

  return (
    <Link
      href={`/items/${item.id}`}
      className={baseClasses}
    >
      {cardContent}
    </Link>
  );
}
