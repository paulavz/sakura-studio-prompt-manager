"use client";

import { useState, useEffect, useRef, RefObject } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getSkills } from "@/app/actions";
import { useClickOutside } from "@/hooks/use-click-outside";

interface SkillSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (skill: SkillItem) => void;
  appliedSkillNames?: string[];
  anchorRef?: RefObject<HTMLElement | null>;
}

interface SkillItem {
  id: string;
  title: string;
}

export function SkillSelector({ isOpen, onClose, onSelect, appliedSkillNames = [], anchorRef }: SkillSelectorProps) {
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    getSkills()
      .then(setSkills)
      .finally(() => setLoading(false));

    const timer = setTimeout(() => {
      const firstBtn = dropdownRef.current?.querySelector<HTMLElement>(
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

  // Measure anchor position when opening
  useEffect(() => {
    if (!isOpen) return;
    const anchor = anchorRef?.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    setPosition({
      top: rect.bottom + 6,
      left: rect.left,
    });
  }, [isOpen, anchorRef]);

  useClickOutside(dropdownRef, onClose, isOpen);

  const handleSelect = (skill: SkillItem) => {
    if (appliedSkillNames.includes(skill.title)) return;
    onSelect(skill);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          data-testid="skill-selector"
          role="dialog"
          aria-modal="true"
          aria-label="Add Skill"
          initial={{ opacity: 0, y: -4, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.97 }}
          transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
          className="fixed z-50 w-[240px] rounded-lg border border-gray-200 bg-white shadow-xl"
          style={{
            top: position.top,
            left: position.left,
          }}
        >
          <div className="px-3 py-2 border-b border-gray-100">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Skills</h2>
          </div>

          <div className="max-h-[280px] overflow-y-auto py-1">
            {loading ? (
              <p className="px-3 py-2 text-xs text-gray-400">Loading skills...</p>
            ) : skills.length === 0 ? (
              <p className="px-3 py-2 text-xs text-gray-400">
                No skills available. Create an item with category &quot;skill&quot; first.
              </p>
            ) : (
              <div className="space-y-[1px]">
                {skills.map((skill) => {
                  const isApplied = appliedSkillNames.includes(skill.title);
                  return (
                    <button
                      key={skill.id}
                      onClick={() => handleSelect(skill)}
                      disabled={isApplied}
                      className={`w-full px-3 py-2 text-left text-[13px] transition-colors ${
                        isApplied
                          ? "text-gray-300 cursor-not-allowed"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span className="flex items-center justify-between">
                        {skill.title}
                        {isApplied && (
                          <span className="text-[10px] text-gray-300">Applied</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
