"use client";

import { useEffect, useRef, useState } from "react";
import {
  getTagsWithUsage,
  createTag,
  deleteTag,
} from "@/app/actions";
import { isValidSlug } from "@/lib/tags";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface TagEntry {
  id: string;
  slug: string;
  usage_count: number;
}

export default function SettingsTagsPage() {
  const [tags, setTags] = useState<TagEntry[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [loading, setLoading] = useState(true);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingSlug, setDeletingSlug] = useState("");

  const [tooltipTag, setTooltipTag] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

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
    if (showCreatePanel && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showCreatePanel]);

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
    setShowCreatePanel(false);
    await loadTags();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreate();
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
      {/* Header */}
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <h2 data-testid="tags-title" className="text-[18px] font-bold tracking-[-0.01em] text-black">
            Tags
          </h2>
          <div className="text-xs text-gray-400 mt-[3px]">
            {tags.length} tag{tags.length !== 1 ? "s" : ""} · snake_case · sorted alphabetically
          </div>
        </div>
        <button
          onClick={() => {
            setShowCreatePanel((v) => !v);
            setError("");
          }}
          className="w-7 h-7 rounded-[var(--radius-sm)] border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:text-black transition-colors text-sm"
          aria-label="Create tag"
          data-testid="create-tag-toggle"
        >
          +
        </button>
      </div>

      {/* Create panel */}
      {showCreatePanel && (
        <div
          className="mb-4 rounded-[var(--radius)] border bg-white px-3 py-[10px]"
          style={{ borderColor: "var(--color-sakura)", boxShadow: "0 0 0 3px var(--color-sakura-soft)" }}
        >
          <input
            ref={inputRef}
            data-testid="tag-input"
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError("");
            }}
            onKeyDown={handleKeyDown}
            placeholder="snake_case_tag"
            className="w-full border-none outline-none font-mono text-[13px] text-gray-800 placeholder:text-gray-300 bg-transparent"
          />
          <div className="flex items-center justify-between mt-[6px]">
            <span className="text-[10.5px] text-gray-400 font-mono">
              Use snake_case (lowercase letters, digits, underscores; must start with a letter).
            </span>
            <div className="flex gap-[6px]">
              <button
                onClick={() => {
                  setShowCreatePanel(false);
                  setInput("");
                  setError("");
                }}
                className="inline-flex items-center gap-[5px] px-3 py-[6px] rounded-[var(--radius-sm)] border border-gray-200 text-[12px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="inline-flex items-center gap-[5px] px-3 py-[6px] rounded-[var(--radius-sm)] border border-black bg-black text-[12px] font-medium text-white hover:bg-gray-800 transition-colors"
              >
                Create
              </button>
            </div>
          </div>
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
      )}

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
        <div
          data-testid="tag-list"
          className="border border-gray-200 rounded-[var(--radius)] overflow-hidden"
        >
          {tags.map((tag, index) => {
            const deletable = tag.usage_count === 0;
            const isLast = index === tags.length - 1;
            return (
              <div
                key={tag.id}
                data-testid="tag-row"
                className="grid items-center"
                style={{
                  gridTemplateColumns: "1fr 140px 100px",
                  padding: "10px 14px",
                  borderBottom: isLast ? "none" : "1px solid #F5F5F5",
                }}
              >
                <span
                  data-testid="tag-slug"
                  className="font-mono text-[13px] text-gray-800"
                >
                  {tag.slug}
                </span>
                <span
                  data-testid="tag-usage-count"
                  className="text-[11px] text-gray-400"
                >
                  used by {tag.usage_count} {tag.usage_count === 1 ? "item" : "items"}
                </span>
                <div
                  className="relative justify-self-end"
                  onMouseEnter={() => {
                    if (!deletable) setTooltipTag(tag.id);
                  }}
                  onMouseLeave={() => setTooltipTag(null)}
                >
                  <button
                    data-testid="tag-delete-btn"
                    onClick={() => deletable && handleDeleteClick(tag)}
                    disabled={!deletable}
                    className="text-[11px] font-medium rounded-[var(--radius-sm)] px-[10px] py-[4px] border transition-colors disabled:cursor-not-allowed"
                    style={{
                      borderColor: deletable ? "#E8E8E8" : "#F5F5F5",
                      color: deletable ? "#222" : "#A0A0A0",
                      background: deletable ? "#fff" : "#FAFAFA",
                    }}
                    title={
                      deletable
                        ? "Delete tag"
                        : undefined
                    }
                  >
                    Delete
                  </button>

                  {/* Tooltip */}
                  {!deletable && tooltipTag === tag.id && (
                    <div
                      className="absolute z-10 whitespace-nowrap"
                      style={{
                        top: -38,
                        right: 0,
                        background: "#222",
                        color: "#fff",
                        fontSize: 11,
                        padding: "5px 9px",
                        borderRadius: 5,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
                      }}
                    >
                      Used by {tag.usage_count} item{tag.usage_count === 1 ? "" : "s"}. Reassign or remove from items first.
                      <span
                        className="absolute"
                        style={{
                          bottom: -4,
                          right: 14,
                          width: 8,
                          height: 8,
                          background: "#222",
                          transform: "rotate(45deg)",
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-3 text-[11px] text-gray-400 max-w-lg">
        Renaming is not available in v1. To rename a tag, create the new tag, reassign items, then delete the old one.
      </p>

      <ConfirmDialog
        isOpen={!!deletingId}
        title={`Delete tag «${deletingSlug}»?`}
        message="This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}
