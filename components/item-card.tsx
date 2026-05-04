"use client";

import Link from "next/link";
import { Item } from "@/lib/database.types";
import { hasVariables } from "@/lib/variables";

interface ItemCardProps {
  item: Item;
}

export function ItemCard({ item }: ItemCardProps) {
  const hasVars = hasVariables(item.content);

  return (
    <Link
      href={`/items/${item.id}`}
      className="group block rounded-lg border border-gray-200 bg-white p-6 transition-colors hover:border-gray-300"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-black">
          {item.title}
        </h3>
        {hasVars && (
          <span className="shrink-0 text-sm" aria-label="Contiene variables">
            🌸
          </span>
        )}
      </div>

      {item.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full border border-gray-200 px-2.5 py-0.5 text-xs text-gray-600"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
