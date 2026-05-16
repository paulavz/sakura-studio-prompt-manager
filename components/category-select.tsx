"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CATEGORY_LABELS, CATEGORIES, CATEGORY_ICONS, ItemCategory } from "@/lib/database.types";

interface CategorySelectProps {
  value: ItemCategory;
  onChange: (cat: ItemCategory) => void;
  disabled?: boolean;
  variant?: "default" | "pill";
}

export function CategorySelect({ value, onChange, disabled = false, variant = "default" }: CategorySelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const triggerClasses =
    variant === "pill"
      ? "rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 border-none"
      : "w-full flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm text-black bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-300 transition-colors";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className={`${triggerClasses} disabled:opacity-50`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <span className={`${variant === "pill" ? "text-[11px]" : "text-[13px]"} opacity-70`}>
            {CATEGORY_ICONS[value]}
          </span>
          <span>{CATEGORY_LABELS[value]}</span>
        </span>
        {variant !== "pill" && (
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            className={`text-gray-400 transition-transform duration-150 shrink-0 ${open ? "rotate-180" : ""}`}
          >
            <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className={`absolute top-full left-0 mt-1 rounded-md border border-gray-200 bg-white shadow-lg z-20 overflow-hidden ${
              variant === "pill" ? "min-w-[160px]" : "right-0"
            }`}
            role="listbox"
          >
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                role="option"
                aria-selected={cat === value}
                onClick={() => {
                  onChange(cat);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                  cat === value
                    ? "bg-gray-100 text-black font-medium"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className={`text-[13px] ${cat === value ? "opacity-100" : "opacity-70"}`}>
                  {CATEGORY_ICONS[cat]}
                </span>
                <span>{CATEGORY_LABELS[cat]}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
