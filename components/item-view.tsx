"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Item, ItemCategory, AppliedSkill, CATEGORY_LABELS, CATEGORIES } from "@/lib/database.types";
import {
  saveItem,
  getTags,
  createTag,
  getItemVersions,
} from "@/app/actions";
import { isValidSlug } from "@/lib/tags";
import { markdownToHtml, htmlToMarkdown } from "@/lib/markdown";
import { hasVariables } from "@/lib/variables";
import { applySkill } from "@/lib/skills";
import { VariableDrawer } from "@/components/variable-drawer";
import { SkillSelector } from "@/components/skill-selector";

interface ItemViewProps {
  item: Item;
  minVarLength?: number;
  maxVarLength?: number;
}

interface Version {
  id: string;
  content_snapshot: string;
  applied_skills_snapshot: AppliedSkill[];
  created_at: string;
}

function asItemCategory(value: string): ItemCategory {
  if (CATEGORIES.includes(value as ItemCategory)) return value as ItemCategory;
  return "template";
}

export function ItemView({ item, minVarLength = 1, maxVarLength = 4000 }: ItemViewProps) {
  const [mode, setMode] = useState<"rendered" | "raw">("rendered");

  const [committed, setCommitted] = useState({
    content: item.content,
    title: item.title,
    category: item.category,
    tags: item.tags,
    appliedSkills: item.applied_skills,
    isFavorite: item.is_favorite,
  });

  const [editedContent, setEditedContent] = useState(item.content);
  const [title, setTitle] = useState(item.title);
  const [category, setCategory] = useState<ItemCategory>(item.category);
  const [tags, setTags] = useState<string[]>(item.tags);
  const [isFavorite, setIsFavorite] = useState(item.is_favorite);
  const [appliedSkills, setAppliedSkills] = useState<AppliedSkill[]>(item.applied_skills);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState<Version[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [skillSelectorOpen, setSkillSelectorOpen] = useState(false);
  const saveSuccessTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const draftAppliedSkillIds = appliedSkills.map((s) => s.id);

  const isContentDirty =
    editedContent !== committed.content ||
    title !== committed.title ||
    category !== committed.category ||
    JSON.stringify(tags) !== JSON.stringify(committed.tags) ||
    JSON.stringify(appliedSkills) !== JSON.stringify(committed.appliedSkills) ||
    isFavorite !== committed.isFavorite;

  const editor = useEditor({
    extensions: [StarterKit],
    content: markdownToHtml(item.content),
    editable: true,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const md = htmlToMarkdown(editor.getHTML());
      setEditedContent(md);
      setSaveError(null);
    },
  });

  useEffect(() => {
    getTags().then(setAvailableTags);
    getItemVersions(item.id).then(setVersions);
  }, [item.id]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isContentDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isContentDirty]);

  const handleModeChange = (newMode: "rendered" | "raw") => {
    if (isContentDirty) {
      return;
    }

    if (newMode === "rendered" && editor) {
      // Suppress update event to avoid dirty state on mode switch
      editor.commands.setContent(markdownToHtml(editedContent), { emitUpdate: false });
    }

    setMode(newMode);
  };

  const commitSave = async (
    contentToSave: string,
    appliedSkillsToSave: AppliedSkill[],
    errorPrefix: string
  ) => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const result = await saveItem(
        item.id,
        contentToSave,
        title,
        category,
        tags,
        appliedSkillsToSave,
        isFavorite
      );

      if (result.success) {
        setCommitted({
          content: result.content || contentToSave,
          title,
          category,
          tags: [...tags],
          appliedSkills: [...appliedSkillsToSave],
          isFavorite,
        });
        setSaveSuccess(true);
        if (saveSuccessTimeoutRef.current) clearTimeout(saveSuccessTimeoutRef.current);
        saveSuccessTimeoutRef.current = setTimeout(() => setSaveSuccess(false), 2000);
        const newVersions = await getItemVersions(item.id);
        setVersions(newVersions);
        return true;
      } else {
        setSaveError(result.error || errorPrefix);
        return false;
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    await commitSave(editedContent, appliedSkills, "Error saving");
  };

  const handleCancel = () => {
    setEditedContent(committed.content);
    setTitle(committed.title);
    setCategory(committed.category);
    setTags([...committed.tags]);
    setAppliedSkills([...committed.appliedSkills]);
    setIsFavorite(committed.isFavorite);
    if (editor) {
      editor.commands.setContent(markdownToHtml(committed.content), { emitUpdate: false });
    }
    setSaveError(null);
  };

  const handleToggleFavorite = () => {
    setIsFavorite((prev) => !prev);
    setSaveError(null);
  };

  const handleAddTag = async () => {
    const slug = tagInput.trim().toLowerCase().replace(/\s+/g, "_");
    if (!slug) return;

    if (!tags.includes(slug)) {
      if (isValidSlug(slug) && !availableTags.includes(slug)) {
        const result = await createTag(slug);
        if (result.success) {
          setAvailableTags([...availableTags, result.slug!]);
          setTags([...tags, result.slug!]);
        }
      } else if (availableTags.includes(slug)) {
        setTags([...tags, slug]);
      }
    }
    setTagInput("");
    setShowTagDropdown(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleRestoreVersion = async (snapshot: string, snapshotAppliedSkills: AppliedSkill[]) => {
    setEditedContent(snapshot);
    setAppliedSkills(snapshotAppliedSkills);
    if (editor) {
      editor.commands.setContent(markdownToHtml(snapshot), { emitUpdate: false });
    }

    await commitSave(snapshot, snapshotAppliedSkills, "Error restoring");
    setShowHistory(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedContent);
      setCopied(true);
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fail silently in toolbar copy; drawer has its own error state
    }
  };

  const handleAddSkill = (skill: { id: string; title: string }) => {
    const result = applySkill(editedContent, appliedSkills, skill.id, skill.title);
    if (result === null) return;

    setEditedContent(result.content);
    setAppliedSkills(result.appliedSkills);
    if (editor) {
      editor.commands.setContent(markdownToHtml(result.content), { emitUpdate: false });
    }

    setSaveError(null);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 px-8 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-gray-600 hover:text-black transition-colors">
            ← Back to gallery
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleFavorite}
              className="text-lg transition-transform hover:scale-110"
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              {isFavorite ? "★" : "☆"}
            </button>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setSaveError(null);
              }}
              className="text-lg font-semibold tracking-tight text-black bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-gray-300 rounded px-1 -ml-1"
            />
          </div>
          <div className="w-20" />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select
            value={category}
            onChange={(e) => {
              setCategory(asItemCategory(e.target.value));
              setSaveError(null);
            }}
            className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 border-none cursor-pointer"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>

          <div className="flex flex-wrap items-center gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600"
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </span>
            ))}
            <div className="relative">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => {
                  setTagInput(e.target.value);
                  setShowTagDropdown(true);
                }}
                onFocus={() => setShowTagDropdown(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                onBlur={() => setTimeout(() => setShowTagDropdown(false), 200)}
                placeholder="+ tag"
                className="w-20 rounded-full border border-gray-200 px-2 py-1 text-xs text-gray-600 placeholder-gray-400"
              />
              {showTagDropdown && tagInput && (
                <div className="absolute top-full left-0 mt-1 w-40 rounded-md border border-gray-200 bg-white shadow-lg z-10">
                  {availableTags
                    .filter((t) => t.includes(tagInput.toLowerCase()))
                    .slice(0, 5)
                    .map((tag) => (
                      <button
                        key={tag}
                        onClick={() => {
                          if (!tags.includes(tag)) {
                            setTags([...tags, tag]);
                          }
                          setTagInput("");
                          setShowTagDropdown(false);
                        }}
                        className="block w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-100"
                      >
                        {tag}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-gray-200 px-8 py-3">
        <div data-testid="mode-toggle" className="flex gap-1 rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => handleModeChange("rendered")}
            disabled={isContentDirty}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "rendered"
                ? "bg-white text-black shadow-sm"
                : isContentDirty
                ? "text-gray-300 cursor-not-allowed"
                : "text-gray-600 hover:text-black"
            }`}
          >
            Rendered
          </button>
          <button
            onClick={() => handleModeChange("raw")}
            disabled={isContentDirty}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "raw"
                ? "bg-white text-black shadow-sm"
                : isContentDirty
                ? "text-gray-300 cursor-not-allowed"
                : "text-gray-600 hover:text-black"
            }`}
          >
            Raw
          </button>
          {isContentDirty && (
            <span className="ml-2 text-xs text-amber-600 self-center">
              Unsaved changes
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="text-xs text-green-600 font-medium">✓ Saved</span>
          )}
          {saveError && (
            <span className="text-xs text-red-600 font-medium">{saveError}</span>
          )}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="rounded-md border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300"
          >
            History
          </button>
          {category !== "skill" && (
            <button
              onClick={() => setSkillSelectorOpen(true)}
              className="rounded-md border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300"
            >
              Add Skill
            </button>
          )}
          {hasVariables(committed.content) && (
            <button
              onClick={() => setDrawerOpen(true)}
              className="rounded-md border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300"
            >
              Use Template
            </button>
          )}
          <button
            onClick={handleCopy}
            className="rounded-md border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300"
          >
            {copied ? "✓ Copied" : "Copy raw"}
          </button>
          {isContentDirty && (
            <>
              <button
                onClick={handleCancel}
                className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-md bg-black px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* History Panel */}
      {showHistory && (
        <div className="border-b border-gray-200 bg-gray-50 p-6">
          <h3 className="mb-3 text-sm font-medium text-gray-700">Version history</h3>
          {versions.length === 0 ? (
            <p className="text-sm text-gray-500">No saved versions.</p>
          ) : (
            <div className="space-y-2">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500">
                      {new Date(v.created_at).toLocaleString()}
                    </p>
                    <p className="truncate text-sm text-gray-700 font-mono">
                      {v.content_snapshot.slice(0, 100)}...
                    </p>
                  </div>
                  <button
                    onClick={() => handleRestoreVersion(v.content_snapshot, v.applied_skills_snapshot)}
                    disabled={isSaving}
                    className="ml-3 shrink-0 rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Applied Skills panel — driven by column, shows SAVED skills only */}
      {committed.appliedSkills.length > 0 && (
        <div
          data-testid="applied-skills-panel"
          className="border-b border-gray-200 bg-gray-50 px-8 py-4"
        >
          <h3 className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
            Applied Skills
          </h3>
          <div className="flex flex-wrap gap-2">
            {committed.appliedSkills.map((skill) => (
              <span
                key={skill.id}
                className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-700"
              >
                {skill.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <main className="p-8">
        {mode === "rendered" ? (
          <div className="prose prose-sm max-w-none text-black">
            <EditorContent editor={editor} className="min-h-[400px] p-4 border border-gray-200 rounded-lg" />
          </div>
        ) : (
          <textarea
            value={editedContent}
            onChange={(e) => {
              setEditedContent(e.target.value);
              setSaveError(null);
            }}
            className="w-full min-h-[400px] p-4 font-mono text-sm text-gray-800 border border-gray-200 rounded-lg resize-y focus:outline-none focus:ring-1 focus:ring-gray-300"
          />
        )}
      </main>

      <VariableDrawer
        content={committed.content}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        minVarLength={minVarLength}
        maxVarLength={maxVarLength}
      />

      <SkillSelector
        isOpen={skillSelectorOpen}
        onClose={() => setSkillSelectorOpen(false)}
        onSelect={handleAddSkill}
        appliedSkillIds={draftAppliedSkillIds}
      />
    </div>
  );
}