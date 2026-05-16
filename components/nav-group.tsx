"use client";

import { useState, useEffect, useId, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      className="transition-transform duration-200"
      style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
      aria-hidden="true"
    >
      <path
        d="M2 3.5L5 6.5L8 3.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface NavGroupProps {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  storageKey?: string;
}

export function NavGroup({
  label,
  children,
  defaultOpen = true,
  storageKey,
}: NavGroupProps) {
  const panelId = useId();
  const initialOpenRef = useRef(defaultOpen);

  const [open, setOpen] = useState(() => {
    if (!storageKey) return defaultOpen;
    try {
      const raw = localStorage.getItem(`sakura-nav-${storageKey}`);
      return raw !== null ? raw === "true" : defaultOpen;
    } catch {
      return defaultOpen;
    }
  });

  // Track previous open value to avoid writing on initial mount.
  const prevOpenRef = useRef(open);

  useEffect(() => {
    if (!storageKey) return;
    if (prevOpenRef.current === open && !initialOpenRef.current) return;
    initialOpenRef.current = false;
    prevOpenRef.current = open;
    try {
      localStorage.setItem(`sakura-nav-${storageKey}`, String(open));
    } catch {
      // localStorage unavailable
    }
  }, [open, storageKey]);

  return (
    <div className="mb-[4px]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full flex items-center justify-between px-[12px] py-[5px] text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em] select-none"
      >
        <span>{label}</span>
        <ChevronIcon open={open} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              duration: 0.2,
              ease: [0.32, 0.72, 0, 1],
            }}
            style={{ overflow: "hidden" }}
          >
            <ul className="mt-[2px] space-y-[1px]">{children}</ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
