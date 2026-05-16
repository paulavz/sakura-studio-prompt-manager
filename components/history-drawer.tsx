"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppliedSkill } from "@/lib/database.types";
import { ConfirmDialog } from "./confirm-dialog";

interface Version {
  id: string;
  content_snapshot: string;
  applied_skills_snapshot: AppliedSkill[];
  created_at: string;
}

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  versions: Version[];
  onRestore: (snapshot: string, appliedSkills: AppliedSkill[]) => void;
  isSaving: boolean;
}

export function HistoryDrawer({
  isOpen,
  onClose,
  versions,
  onRestore,
  isSaving,
}: HistoryDrawerProps) {
  const drawerRef = useRef<HTMLElement | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<{ snapshot: string; appliedSkills: AppliedSkill[] } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      const firstBtn = drawerRef.current?.querySelector<HTMLElement>(
        "button:not(:disabled)"
      );
      firstBtn?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab" && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          "button, textarea, input, [href], select, details, [tabindex]:not([tabindex='-1'])"
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleRestoreClick = (snapshot: string, appliedSkills: AppliedSkill[]) => {
    setPendingRestore({ snapshot, appliedSkills });
    setConfirmOpen(true);
  };

  const handleConfirmRestore = () => {
    if (pendingRestore) {
      onRestore(pendingRestore.snapshot, pendingRestore.appliedSkills);
    }
    setConfirmOpen(false);
    setPendingRestore(null);
  };

  const handleCancelRestore = () => {
    setConfirmOpen(false);
    setPendingRestore(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="history-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/10"
          />

          {/* Drawer */}
          <motion.aside
            key="history-drawer"
            ref={drawerRef}
            data-testid="history-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Version history"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            className="fixed right-0 top-0 z-50 flex h-full w-[var(--width-history)] flex-col border-l border-gray-200 bg-white shadow-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-sm font-semibold text-black">Version History</h2>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {versions.length} / 50 versions stored
                </p>
              </div>
              <button
                aria-label="Close"
                onClick={onClose}
                className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-black"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M12 4L4 12M4 4l8 8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {/* Version list */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {versions.length === 0 ? (
                <p data-testid="history-empty" className="text-sm text-gray-400">
                  No saved versions yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {versions.map((v, index) => {
                    const isCurrent = index === 0;
                    return (
                      <div
                        key={v.id}
                        data-testid="version-entry"
                        className={`rounded-lg border p-4 ${
                          isCurrent
                            ? "border-[var(--color-sakura-40)] bg-[var(--color-sakura-10)]"
                            : "border-gray-200 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-medium ${isCurrent ? "text-sakura" : "text-gray-500"}`}>
                            {isCurrent ? "Current version" : `Version ${versions.length - index}`}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(v.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 font-mono mb-3 line-clamp-3">
                          {v.content_snapshot.slice(0, 120)}
                          {v.content_snapshot.length > 120 ? "..." : ""}
                        </p>
                        <button
                          onClick={() => handleRestoreClick(v.content_snapshot, v.applied_skills_snapshot)}
                          disabled={isSaving}
                          className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                          {isCurrent ? "Restore content" : "Restore content"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.aside>

          <ConfirmDialog
            isOpen={confirmOpen}
            title="Restore Version"
            message="Restore this version? Your current changes will be discarded."
            confirmLabel="Restore"
            cancelLabel="Cancel"
            onConfirm={handleConfirmRestore}
            onCancel={handleCancelRestore}
          />
        </>
      )}
    </AnimatePresence>
  );
}
