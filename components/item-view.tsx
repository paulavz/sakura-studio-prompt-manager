"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Item, ItemCategory, AppliedSkill, CATEGORY_LABELS, CATEGORIES } from "@/lib/database.types";
import { useItemState } from "@/hooks/use-item-state";
import { useClickOutside } from "@/hooks/use-click-outside";
import { hasVariables } from "@/lib/variables";
import { ItemEditor } from "@/components/item-editor";
import { EditorErrorBoundary } from "@/components/editor-error-boundary";
import { VariableDrawer } from "@/components/variable-drawer";
import { SkillSelector } from "@/components/skill-selector";
import { AgentSelector } from "@/components/agent-selector";
import { SaveBar } from "@/components/save-bar";
import { PetalRain } from "@/components/petal-rain";
import { HistoryDrawer } from "@/components/history-drawer";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface ItemViewProps {
  item: Item;
  minVarLength?: number;
  maxVarLength?: number;
  embedded?: boolean;
}

function asItemCategory(value: string): ItemCategory {
  if (CATEGORIES.includes(value as ItemCategory)) return value as ItemCategory;
  return "template";
}

export function ItemView({ item, minVarLength = 1, maxVarLength = 4000, embedded = false }: ItemViewProps) {
  const [mode, setMode] = useState<"rendered" | "raw">("rendered");
  const [showHistory, setShowHistory] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [skillSelectorOpen, setSkillSelectorOpen] = useState(false);
  const [agentSelectorOpen, setAgentSelectorOpen] = useState(false);
  const [petalTrigger, setPetalTrigger] = useState(0);
  const [agentConfirmOpen, setAgentConfirmOpen] = useState(false);
  const [pendingAgentTitle, setPendingAgentTitle] = useState<string | null>(null);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const addSkillBtnRef = useRef<HTMLButtonElement>(null);

  useClickOutside(tagDropdownRef, () => setShowTagDropdown(false), showTagDropdown);

  const {
    editedContent,
    title,
    category,
    tags,
    isFavorite,
    isContentDirty,
    committedAgent,
    currentAgentName,
    draftSkillNames,
    isSaving,
    saveError,
    versions,
    availableTags,
    setTitle,
    setCategory,
    setTags,
    setEditedContent,
    setSaveError,
    handleSave,
    handleCancel,
    handleToggleFavorite,
    handleAddTag,
    handleRemoveTag,
    handleRestoreVersion,
    handleAddSkill,
    handleRemoveSkill,
    handleAssignAgent,
    handleConfirmAgentReplace,
    handleUnassignAgent,
  } = useItemState(item);

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

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    };
  }, []);

  const handleModeChange = (newMode: "rendered" | "raw") => {
    if (isContentDirty) return;
    setMode(newMode);
  };

  const onSave = async () => {
    const ok = await handleSave();
    if (ok) setPetalTrigger((p) => p + 1);
  };

  const onRestore = async (snapshot: string, snapshotSkills: AppliedSkill[]) => {
    const ok = await handleRestoreVersion(snapshot, snapshotSkills);
    if (ok) setShowHistory(false);
  };

  const onAddTag = async () => {
    const raw = tagInput.trim();
    if (!raw) return;
    await handleAddTag(raw);
    setTagInput("");
    setShowTagDropdown(false);
  };

  const onAssignAgent = (agent: { title: string }) => {
    handleAssignAgent(agent, (title) => {
      setPendingAgentTitle(title);
      setAgentConfirmOpen(true);
    });
  };

  const onConfirmAgentReplace = () => {
    if (pendingAgentTitle) handleConfirmAgentReplace(pendingAgentTitle);
    setPendingAgentTitle(null);
    setAgentConfirmOpen(false);
  };

  const onCancelAgentReplace = () => {
    setPendingAgentTitle(null);
    setAgentConfirmOpen(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedContent);
      setCopied(true);
      setPetalTrigger((n) => n + 1);
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = setTimeout(() => setCopied(false), 1400);
    } catch {
      // Fail silently
    }
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
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-semibold tracking-tight text-black bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-gray-300 rounded px-1 -ml-1 flex-1"
            />
            {committedAgent && category !== "agente" && category !== "skill" && (
              <div data-testid="assigned-agent-badge" className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] text-gray-500">by</span>
                <span
                  className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium truncate max-w-[180px]"
                  style={{
                    backgroundColor: "var(--color-agent-pill-bg)",
                    borderColor: "var(--color-agent-pill-border)",
                    color: "var(--color-agent-pill-text)",
                  }}
                >
                  @{committedAgent}
                </span>
                <button
                  data-testid="unassign-agent-btn"
                  aria-label="Remove agent"
                  onClick={handleUnassignAgent}
                  className="text-[10px] text-gray-400 hover:text-gray-700 transition-colors leading-none"
                >
                  ×
                </button>
              </div>
            )}
          </div>
          <div className="w-20" />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select
            value={category}
            onChange={(e) => setCategory(asItemCategory(e.target.value))}
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
                className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs text-variable-text bg-sakura-soft border-sakura/40"
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
            <div ref={tagDropdownRef} className="relative">
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
                    onAddTag();
                  }
                }}
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
                        onMouseDown={(e) => {
                          // mousedown fires before blur — prevents dropdown from closing
                          // before the click registers
                          e.preventDefault();
                          if (!tags.includes(tag)) setTags([...tags, tag]);
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
            <span data-testid="error-message" className="text-xs text-red-600 font-medium">
              {saveError}
            </span>
          )}
          <button
            aria-label="Open version history"
            onClick={() => setShowHistory(!showHistory)}
            className="rounded-md border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300"
          >
            History
          </button>
          {category !== "skill" && (
            <button
              ref={addSkillBtnRef}
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
              className="rounded-md border px-4 py-1.5 text-sm font-medium transition-colors"
              style={{
                borderColor: "var(--color-agent-pill-border)",
                color: "var(--color-agent-pill-text)",
                backgroundColor: "transparent",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-agent-pill-bg)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
              }}
            >
              <span className="flex items-center gap-1.5">
                <span className="text-xs">⌥</span>
                Assign Agent
              </span>
            </button>
          )}
          {hasVariables(editedContent) && (
            <button
              onClick={() => setDrawerOpen(true)}
              className="rounded-md border border-sakura px-4 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:shadow-[0_0_12px_var(--color-sakura-glow)] hover:border-sakura"
            >
              <span className="flex items-center gap-1.5">
                <span className="text-xs">🌸</span>
                Use Template
              </span>
            </button>
          )}
          <button
            data-testid="copy-btn"
            onClick={handleCopy}
            className={`inline-flex items-center gap-[6px] rounded-md border px-4 py-1.5 text-sm font-medium transition-colors ${
              copied
                ? "border-gray-200 text-gray-700"
                : "border-gray-200 text-gray-700 hover:border-sakura hover:text-sakura"
            }`}
          >
            {copied ? (
              <>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 8L7 12L13 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="2" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M5 5H13C13.5523 5 14 5.44772 14 6V13C14 13.5523 13.5523 14 13 14H6C5.44772 14 5 13.5523 5 13V5Z" stroke="currentColor" strokeWidth="1.2"/>
                </svg>
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Skills strip */}
      {draftSkillNames.length > 0 && (
        <div
          data-testid="applied-skills-panel"
          className="flex items-center gap-2 overflow-x-auto px-8 py-2"
        >
          <span className="text-[11px] text-gray-500 shrink-0">Active skills:</span>
          {draftSkillNames.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium shrink-0"
              style={{
                backgroundColor: "var(--color-sakura-soft)",
                borderColor: "var(--color-sakura-50)",
                color: "var(--color-variable-text)",
              }}
            >
              <span>✦</span>
              {name}
              <button
                onClick={() => handleRemoveSkill(name)}
                className="ml-0.5 text-[10px] opacity-60 hover:opacity-100 transition-opacity"
                aria-label={`Remove skill ${name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Content */}
      <main className={`p-8 ${isContentDirty ? "pb-24" : ""}`}>
        <EditorErrorBoundary>
          <ItemEditor
            mode={mode}
            value={editedContent}
            onChange={setEditedContent}
            onClearError={() => setSaveError(null)}
          />
        </EditorErrorBoundary>
      </main>

      <SaveBar visible={isContentDirty} onSave={onSave} onCancel={handleCancel} isSaving={isSaving} />

      <PetalRain trigger={petalTrigger} />

      <VariableDrawer
        content={editedContent}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        minVarLength={minVarLength}
        maxVarLength={maxVarLength}
        onCopy={() => setPetalTrigger((n) => n + 1)}
      />

      <SkillSelector
        isOpen={skillSelectorOpen}
        onClose={() => setSkillSelectorOpen(false)}
        onSelect={handleAddSkill}
        appliedSkillNames={draftSkillNames}
        anchorRef={addSkillBtnRef}
      />

      <AgentSelector
        isOpen={agentSelectorOpen}
        onClose={() => setAgentSelectorOpen(false)}
        onSelect={onAssignAgent}
        currentAgentName={currentAgentName}
      />

      <HistoryDrawer
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        versions={versions}
        onRestore={onRestore}
        isSaving={isSaving}
      />

      <ConfirmDialog
        isOpen={agentConfirmOpen}
        title="Replace Agent"
        message={
          <>
            This will replace <span className="font-medium text-gray-900">«{currentAgentName}»</span> with{" "}
            <span className="font-medium text-gray-900">«{pendingAgentTitle}»</span>.
            <br />
            Continue?
          </>
        }
        confirmLabel="Replace"
        cancelLabel="Cancel"
        onConfirm={onConfirmAgentReplace}
        onCancel={onCancelAgentReplace}
      />
    </div>
  );
}
