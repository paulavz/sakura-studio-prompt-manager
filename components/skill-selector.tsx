"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getSkills } from "@/app/actions";

interface SkillSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (skill: SkillItem) => void;
  appliedSkillIds?: string[];
}

interface SkillItem {
  id: string;
  title: string;
}

export function SkillSelector({ isOpen, onClose, onSelect, appliedSkillIds = [] }: SkillSelectorProps) {
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [loading, setLoading] = useState(false);
  const dialogRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    getSkills()
      .then(setSkills)
      .finally(() => setLoading(false));

    const timer = setTimeout(() => {
      const firstBtn = dialogRef.current?.querySelector<HTMLElement>(
        "button:not(:disabled)"
      );
      firstBtn?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleSelect = (skill: SkillItem) => {
    if (appliedSkillIds.includes(skill.id)) return;
    onSelect(skill);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/10"
          />
          <motion.aside
            key="skill-selector"
            ref={dialogRef}
            data-testid="skill-selector"
            role="dialog"
            aria-modal="true"
            aria-label="Add Skill"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm md:max-w-md flex-col border-l border-gray-200 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-sm font-semibold text-black">Add Skill</h2>
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

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {loading ? (
                <p className="text-sm text-gray-400">Loading skills...</p>
              ) : skills.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No skills available. Create a item with category &quot;skill&quot; first.
                </p>
              ) : (
                <div className="space-y-2">
                  {skills.map((skill) => {
                    const isApplied = appliedSkillIds.includes(skill.id);
                    return (
                      <button
                        key={skill.id}
                        onClick={() => handleSelect(skill)}
                        disabled={isApplied}
                        className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                          isApplied
                            ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                            : "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <span className="flex items-center justify-between">
                          {skill.title}
                          {isApplied && (
                            <span className="text-xs text-gray-300">Applied</span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
