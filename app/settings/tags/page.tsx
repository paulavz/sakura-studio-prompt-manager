"use client";

import { useEffect, useRef, useState } from "react";
import {
  getTagsWithUsage,
  createTag,
  deleteTag,
  renameTag,
} from "@/app/actions";
import { isValidSlug } from "@/lib/tags";

interface TagEntry {
  id: string;
  slug: string;
  usage_count: number;
}

export default function SettingsTagsPage() {
  const [tags, setTags] = useState<TagEntry[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingSlug, setDeletingSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const tagListRef = useRef<HTMLDivElement>(null);

  const cancelEditing = () => {
    setEditingId(null);
    setEditingValue("");
  };

  async function loadTags() {
    setLoading(true);
    try {
      const data = await getTagsWithUsage();
      setTags([...data].sort((a, b) => a.slug.localeCompare(b.slug)));
    } catch {
      setTags([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const data = await getTagsWithUsage();
        if (!cancelled) {
          setTags([...data].sort((a, b) => a.slug.localeCompare(b.slug)));
        }
      } catch {
        if (!cancelled) {
          setTags([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!editingId) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        tagListRef.current &&
        !tagListRef.current.contains(e.target as Node)
      ) {
        cancelEditing();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editingId]);

  const handleCreate = async () => {
    setError("");
    const raw = input.trim();
    if (!raw) return;
    if (!isValidSlug(raw)) {
      setError("Slug must be snake_case (lowercase, digits, underscores).");
      return;
    }
    const result = await createTag(raw);
    if (!result.success) {
      setError(result.error || "Failed to create tag");
      return;
    }
    setInput("");
    await loadTags();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreate();
    }
  };

  const startEditing = (tag: TagEntry) => {
    setEditingId(tag.id);
    setEditingValue(tag.slug);
  };

  const handleRename = async (id: string) => {
    setError("");
    if (!editingValue.trim()) {
      cancelEditing();
      return;
    }

    const result = await renameTag(id, editingValue.trim());
    if (!result.success) {
      setError(result.error || "Failed to rename tag");
      return;
    }
    cancelEditing();
    await loadTags();
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleRename(id);
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEditing();
    }
  };

  const handleDeleteClick = (tag: TagEntry) => {
    setDeletingId(tag.id);
    setDeletingSlug(tag.slug);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    const result = await deleteTag(deletingId);
    if (!result.success) {
      setError(result.error || "Failed to delete tag");
    }
    setDeletingId(null);
    setDeletingSlug("");
    await loadTags();
  };

  const handleDeleteCancel = () => {
    setDeletingId(null);
    setDeletingSlug("");
  };

  return (
    <div data-testid="settings-tags-page">
      <h2 className="text-xl font-semibold tracking-tight text-black mb-6">
        Tags
      </h2>

      <div className="mb-6">
        <label htmlFor="tag-input" className="block text-sm font-medium text-gray-700 mb-2">
          Create new tag
        </label>
        <input
          id="tag-input"
          data-testid="tag-input"
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setError("");
          }}
          onKeyDown={handleKeyDown}
          placeholder="snake_case_tag"
          className="w-full max-w-sm rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400"
        />
        {error && (
          <div
            data-testid="error-message"
            className="mt-2 text-sm text-error"
            role="alert"
          >
            {error}
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading tags...</p>
      ) : tags.length === 0 ? (
        <div
          data-testid="no-tags-message"
          className="text-sm text-gray-500"
        >
          No tags yet. Create one above to get started.
        </div>
      ) : (
        <div ref={tagListRef} data-testid="tag-list" className="space-y-2 max-w-lg">
          {tags.map((tag) => (
            <div
              key={tag.id}
              data-testid="tag-row"
              className="flex items-center justify-between rounded-md border border-gray-200 px-4 py-3"
            >
              {editingId === tag.id ? (
                <input
                  data-testid="tag-rename-input"
                  type="text"
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onKeyDown={(e) => handleRenameKeyDown(e, tag.id)}
                  autoFocus
                  className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              ) : (
                <div className="flex items-center gap-3">
                  <span
                    data-testid="tag-slug"
                    onDoubleClick={() => startEditing(tag)}
                    className="text-sm text-gray-900 cursor-pointer hover:text-gray-600"
                  >
                    {tag.slug}
                  </span>
                  <span
                    data-testid="tag-usage-count"
                    className="text-xs text-gray-400"
                  >
                    {tag.usage_count} {tag.usage_count === 1 ? "item" : "items"}
                  </span>
                </div>
              )}
              <button
                data-testid="tag-delete-btn"
                onClick={() => handleDeleteClick(tag)}
                disabled={tag.usage_count > 0}
                className="text-sm text-gray-400 hover:text-error disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-gray-400"
                title={
                  tag.usage_count > 0
                    ? `Used by ${tag.usage_count} item(s)`
                    : "Remove tag"
                }
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {deletingId && (
        <div
          data-testid="confirm-delete"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
        >
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-lg max-w-sm">
            <h3 className="text-base font-semibold text-black mb-2">
              Remove tag
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to remove the tag{" "}
              <span className="font-medium text-gray-900">&quot;{deletingSlug}&quot;</span>?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleDeleteCancel}
                className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="rounded-md bg-error px-4 py-2 text-sm text-white hover:bg-error/90"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
