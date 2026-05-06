"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getAgents } from "@/app/actions";
import { normalizeAgentTitle } from "@/lib/agent";

interface AgentSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (agent: AgentItem) => void;
  currentAgentName?: string | null;
}

interface AgentItem {
  id: string;
  title: string;
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function AgentSelector({
  isOpen,
  onClose,
  onSelect,
  currentAgentName,
}: AgentSelectorProps) {
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const dialogRef = useRef<HTMLElement | null>(null);

  // Body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  // Load agents + keyboard handling (Escape + focus trap)
  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    getAgents()
      .then((data) => {
        setAgents(data);
        setTimeout(() => {
          dialogRef.current
            ?.querySelector<HTMLElement>('button:not([aria-label="Close"])')
            ?.focus();
        }, 50);
      })
      .finally(() => setLoading(false));

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const nodes = dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSelect = (agent: AgentItem) => {
    onSelect(agent);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="agent-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/10"
          />
          <motion.aside
            key="agent-selector"
            ref={dialogRef}
            data-testid="agent-selector"
            role="dialog"
            aria-modal="true"
            aria-label="Assign Agent"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm md:max-w-md flex-col border-l border-gray-200 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-sm font-semibold text-black">Assign Agent</h2>
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
                <p className="text-sm text-gray-400">Loading agents...</p>
              ) : agents.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No agents available. Create an item with category &quot;Agentes&quot; first.
                </p>
              ) : (
                <div className="space-y-2">
                  {agents.map((agent) => {
                    const isCurrent = normalizeAgentTitle(agent.title) === normalizeAgentTitle(currentAgentName ?? "");
                    return (
                      <button
                        key={agent.id}
                        onClick={() => handleSelect(agent)}
                        aria-current={isCurrent ? "true" : undefined}
                        className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                          isCurrent
                            ? "border-gray-400 bg-gray-50 text-gray-700"
                            : "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <span className="flex items-center justify-between">
                          {agent.title}
                          {isCurrent && (
                            <span className="text-xs text-gray-400">Current</span>
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
