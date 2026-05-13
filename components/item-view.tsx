"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { VariableChip } from "./tiptap-variable-chip";
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
import { applySkill, scanSkills } from "@/lib/skills";
import { extractAgent, applyAgent, removeAgent, normalizeAgentTitle } from "@/lib/agent";
import { VariableDrawer } from "@/components/variable-drawer";
import { SkillSelector } from "@/components/skill-selector";
import { AgentSelector } from "@/components/agent-selector";
import { SaveBar } from "@/components/save-bar";
import { PetalRain } from "@/components/petal-rain";
import { HistoryDrawer } from "@/components/history-drawer";

interface ItemViewProps {
  item: Item;
  minVarLength?: number;
  maxVarLength?: number;
  embedded?: boolean;
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

export function ItemView({ item, minVarLength = 1, maxVarLength = 4000, embedded = false }: ItemViewProps) {
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
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState<Version[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [skillSelectorOpen, setSkillSelectorOpen] = useState(false);
  const [agentSelectorOpen, setAgentSelectorOpen] = useState(false);
  const [petalTrigger, setPetalTrigger] = useState(0);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const committedAgent = extractAgent(committed.content);
  const currentAgentName = extractAgent(editedContent);
  const committedSkillNames = scanSkills(committed.content);
  const draftSkillNames = scanSkills(editedContent);

  const isContentDirty =
    editedContent !== committed.content ||
    title !== committed.title ||
    category !== committed.category ||
    JSON.stringify(tags) !== JSON.stringify(committed.tags) ||
    JSON.stringify(appliedSkills) !== JSON.stringify(committed.appliedSkills) ||
    isFavorite !== committed.isFavorite;

  const editor = useEditor({
    extensions: [StarterKit, VariableChip],
    content: markdownToHtml(item.content),
    editable: true,
    immediatelyRender: false,
    editorProps: {
      handlePaste: (view, event) => {
        // Paste as plain text by default (Ctrl+Shift+V still works natively)
        event.preventDefault();
        const text = event.clipboardData?.getData("text/plain") || "";
        view.dispatch(view.state.tr.insertText(text));
        return true;
      },
    },
    onUpdate: ({ editor }) => {
      const md = htmlToMarkdown(editor.getHTML());
      setEditedContent(md);
      setSaveError(null);
    },
  });

  const setMarkdown = useCallback(
    (md: string) => {
      setEditedContent(md);
      if (editor) {
        editor.commands.setContent(markdownToHtml(md), { emitUpdate: false });
      }
    },
    [editor]
  );

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
        setPetalTrigger((prev) => prev + 1);
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
    setTitle(committed.title);
    setCategory(committed.category);
    setTags([...committed.tags]);
    setAppliedSkills([...committed.appliedSkills]);
    setIsFavorite(committed.isFavorite);
    setMarkdown(committed.content);
    setSaveError(null);
  };

  const handleToggleFavorite = () => {
    setIsFavorite((prev) => !prev);
    setSaveError(null);
  };

  const handleAddTag = async () => {
    const raw = tagInput.trim();
    if (!raw) return;

    const slug = raw.toLowerCase().replace(/\s+/g, "_");
    if (!isValidSlug(raw)) {
      setSaveError("Slug must be snake_case (lowercase, digits, underscores).");
      return;
    }

    if (!tags.includes(slug)) {
      if (!availableTags.includes(slug)) {
        const result = await createTag(slug);
        if (result.success) {
          setAvailableTags([...availableTags, result.slug!]);
          setTags([...tags, result.slug!]);
        }
      } else {
        setTags([...tags, slug]);
      }
    }
    setTagInput("");
    setShowTagDropdown(false);
    setSaveError("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleRestoreVersion = async (snapshot: string, snapshotAppliedSkills: AppliedSkill[]) => {
    setAppliedSkills(snapshotAppliedSkills);
    setMarkdown(snapshot);
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
    setAppliedSkills(result.appliedSkills);
    setMarkdown(result.content);
    setSaveError(null);
  };

  const handleAssignAgent = ({ title }: { title: string }) => {
    if (currentAgentName && normalizeAgentTitle(currentAgentName) === normalizeAgentTitle(title)) return;
    setMarkdown(applyAgent(editedContent, title));
    setSaveError(null);
  };

  const handleUnassignAgent = () => {
    setMarkdown(removeAgent(editedContent));
    setSaveError(null);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 px-8 py-4">
        <div className="flex items-center justify-between">
          {!embedded && (
            <Link href="/" className="text-sm text-gray-600 hover:text-black transition-colors">
              ← Back to gallery
            </Link>
          )}
          <div className={`flex items-center gap-3 ${embedded ? "flex-1" : ""}`}>
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
              className="text-lg font-semibold tracking-tight text-black bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-gray-300 rounded px-1 -ml-1 flex-1"
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
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${
                  hasVariables(editedContent)
                    ? "text-variable-text bg-sakura-soft border-sakura/40"
                    : "text-gray-600 bg-gray-50 border-gray-200"
                }`}
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
        </div>

        <div className="flex items-center gap-2">
          {saveError && (
            <span data-testid="error-message" className="text-xs text-red-600 font-medium">{saveError}</span>
          )}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="rounded-md border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300"
          >
            History
          </button>
          {category !== "skill" && (
            <button
              id="add-skill-btn"
              onClick={() => setSkillSelectorOpen(true)}
              className="rounded-md border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300"
            >
              Add Skill
            </button>
          )}
          {category !== "agente" && category !== "skill" && (
            <button
              id="assign-agent-btn"
              onClick={() => setAgentSelectorOpen(true)}
              className="rounded-md border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300"
            >
              Assign Agent
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
        </div>
      </div>



      {/* Applied Skills panel — scanned from saved content */}
      {committedSkillNames.length > 0 && (
        <div
          data-testid="applied-skills-panel"
          className="border-b border-gray-200 bg-gray-50 px-8 py-3 flex items-center gap-2"
        >
          <span className="text-xs text-gray-400">Skills:</span>
          <div className="flex flex-wrap gap-2">
            {committedSkillNames.map((name) => (
              <span
                key={name}
                className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs text-gray-700"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Assigned Agent badge — chip by @agent */}
      {category !== "agente" && category !== "skill" && (
        <div
          data-testid="assigned-agent-badge"
          className="border-b border-gray-200 bg-gray-50 px-8 py-3 flex items-center gap-2"
        >
          {committedAgent ? (
            currentAgentName ? (
              <>
                <span className="text-xs text-gray-400">by</span>
                <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs font-medium text-gray-700">
                  @{committedAgent}
                </span>
              </>
            ) : (
              <>
                <span className="text-xs text-gray-400">by</span>
                <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs text-gray-400 line-through">
                  @{committedAgent}
                  <span className="ml-1 text-gray-300">(removing)</span>
                </span>
              </>
            )
          ) : (
            <span className="text-xs text-gray-400">Sin agente asignado</span>
          )}
          {committedAgent && (
            <button
              data-testid="unassign-agent-btn"
              aria-label="Remove agent"
              onClick={handleUnassignAgent}
              className="ml-1 text-xs text-gray-400 hover:text-gray-700 transition-colors"
            >
              × Remove
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <main className={`p-8 ${isContentDirty ? "pb-24" : ""}`}>
        {mode === "rendered" ? (
          <div className="prose prose-sm max-w-none text-black">
            <EditorContent
              editor={editor}
              className="min-h-[400px]"
            />
          </div>
        ) : (
          <textarea
            value={editedContent}
            onChange={(e) => {
              setEditedContent(e.target.value);
              setSaveError(null);
            }}
            className="raw-pre"
          />
        )}
      </main>

      <SaveBar
        visible={isContentDirty}
        onSave={handleSave}
        onCancel={handleCancel}
        isSaving={isSaving}
      />

      <PetalRain trigger={petalTrigger} />

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
        appliedSkillNames={draftSkillNames}
      />

      <AgentSelector
        isOpen={agentSelectorOpen}
        onClose={() => setAgentSelectorOpen(false)}
        onSelect={handleAssignAgent}
        currentAgentName={currentAgentName}
      />

      <HistoryDrawer
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        versions={versions}
        onRestore={handleRestoreVersion}
        isSaving={isSaving}
      />
    </div>
  );
}