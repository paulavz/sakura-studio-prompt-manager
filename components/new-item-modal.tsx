"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createItem } from "@/app/actions";
import { ItemCategory } from "@/lib/database.types";
import { CategorySelect } from "./category-select";

interface NewItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}

export function NewItemModal({ isOpen, onClose, onCreated }: NewItemModalProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ItemCategory>("template");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTitle("");
    setCategory("template");
    setError(null);
    setPending(false);
    const timer = setTimeout(() => titleInputRef.current?.focus(), 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, pending]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending || !title.trim()) return;

    setPending(true);
    setError(null);

    const result = await createItem(title, category);

    if (result.id) {
      onCreated(result.id);
    } else {
      setError(result.error || "Failed to create item.");
      setPending(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="new-item-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => !pending && onClose()}
            className="fixed inset-0 z-50 bg-black/10"
          />
          <motion.div
            key="new-item-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-item-title"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-lg"
          >
            <h3 id="new-item-title" className="text-base font-semibold text-black mb-4">
              New prompt
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="new-item-title-input" className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  ref={titleInputRef}
                  id="new-item-title-input"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={pending}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-black placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 disabled:opacity-50"
                  placeholder="My new prompt..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <CategorySelect
                  value={category}
                  onChange={setCategory}
                  disabled={pending}
                />
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={pending}
                  className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending || !title.trim()}
                  className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {pending ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
