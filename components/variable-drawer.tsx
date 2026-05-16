"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { extractVariables, replaceVariables } from "@/lib/variables";

interface VariableDrawerProps {
  content: string;
  isOpen: boolean;
  onClose: () => void;
  minVarLength?: number;
  maxVarLength?: number;
  onCopy?: () => void;
}

function slugifyId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function autoResize(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

export function VariableDrawer({
  content,
  isOpen,
  onClose,
  minVarLength = 1,
  maxVarLength = 4000,
  onCopy,
}: VariableDrawerProps) {
  const variables = useMemo(() => extractVariables(content), [content]);

  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const firstInputRef = useRef<HTMLTextAreaElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drawerRef = useRef<HTMLElement | null>(null);

  // Focus trap + ESC handler
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      firstInputRef.current?.focus();
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

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const validate = (_name: string, value: string): string => {
    if (value.length < minVarLength) {
      return `Min ${minVarLength} character${minVarLength > 1 ? "s" : ""}`;
    }
    if (value.length > maxVarLength) {
      return `Max ${maxVarLength} characters`;
    }
    return "";
  };

  const handleChange = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: validate(name, value) }));
  };

  const isAllValid = variables.every((name) => {
    const v = values[name] ?? "";
    return v.length >= minVarLength && v.length <= maxVarLength;
  });

  const filledCount = variables.filter((name) => {
    const v = values[name] ?? "";
    return v.length >= minVarLength && v.length <= maxVarLength;
  }).length;

  const handleCopy = async () => {
    const result = replaceVariables(content, values);
    try {
      await navigator.clipboard.writeText(result);
      setCopyFeedback(true);
      setCopyError(false);
      onCopy?.();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopyFeedback(false), 1400);
    } catch {
      setCopyError(true);
      setCopyFeedback(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopyError(false), 1400);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/10"
            style={{ backdropFilter: "blur(2px)" }}
          />

          {/* Drawer */}
          <motion.aside
            key="drawer"
            ref={drawerRef}
            data-testid="variable-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Use template"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            className="fixed right-0 top-0 z-50 flex h-full w-[var(--width-vars)] flex-col border-l border-gray-200 bg-white shadow-xl"
          >
            {/* Header */}
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-black flex items-center gap-1.5">
                  <span className="text-xs">🌸</span>
                  Use Template
                </h2>
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
              {variables.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-[4px] bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${(filledCount / variables.length) * 100}%`,
                        backgroundColor: "var(--color-sakura)",
                        boxShadow: filledCount > 0 ? "0 0 6px var(--color-sakura)" : "none",
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {filledCount}/{variables.length}
                  </span>
                </div>
              )}
            </div>

            {/* Variable inputs */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {variables.length === 0 ? (
                <p data-testid="variable-empty-state" className="text-sm text-gray-400">
                  No variables detected.
                </p>
              ) : (
                <div data-testid="variable-inputs" className="space-y-5">
                  {variables.map((name, index) => {
                    const value = values[name] ?? "";
                    const error = errors[name] ?? "";
                    const inputId = `var-input-${slugifyId(name)}`;
                    const isFilled = value.length > 0;
                    return (
                      <div key={name} className="flex flex-col gap-1.5">
                        <label
                          htmlFor={inputId}
                          className="flex items-center gap-2 text-xs font-medium"
                          style={{ color: isFilled ? "var(--color-variable-text)" : "#374151" }}
                        >
                          {isFilled && (
                            <span className="w-[6px] h-[6px] rounded-full bg-sakura" />
                          )}
                          <span>{name}</span>
                          <code className="text-[10px] px-1 py-0.5 rounded bg-gray-100 text-gray-600 font-mono">
                            {"{{"}{name}{"}}"}
                          </code>
                        </label>
                        <textarea
                          id={inputId}
                          ref={index === 0 ? firstInputRef : undefined}
                          value={value}
                          onChange={(e) => {
                            handleChange(name, e.target.value);
                            autoResize(e.currentTarget);
                          }}
                          onInput={(e) => autoResize(e.currentTarget)}
                          rows={3}
                          className={`w-full resize-y rounded-lg border px-3 py-2 font-mono text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-1 ${
                            isFilled
                              ? "border-sakura/40 shadow-[0_0_8px_var(--color-sakura-glow)] focus:ring-sakura/40"
                              : error
                              ? "border-red-300 focus:ring-red-300"
                              : "border-gray-200 focus:ring-gray-300"
                          }`}
                          placeholder={`Value for ${name}…`}
                          style={{
                            background: isFilled
                              ? "var(--color-sakura-6)"
                              : undefined,
                          }}
                        />
                        <span className="text-[10px] text-gray-400 self-end">
                          {value.length} / {maxVarLength}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Result preview */}
            {filledCount > 0 && (
              <div className="border-t border-gray-200 px-6 py-3">
                <div className="text-[10px] text-gray-500 font-medium mb-1">Result preview</div>
                <pre className="bg-gray-50 border border-gray-200 rounded-md p-3 text-[11px] font-mono text-gray-700 max-h-[180px] overflow-y-auto whitespace-pre-wrap">
                  {replaceVariables(content, values)}
                </pre>
              </div>
            )}

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4">
              <button
                onClick={handleCopy}
                disabled={!isAllValid}
                className={`relative w-full inline-flex items-center justify-center gap-[6px] rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  copyFeedback
                    ? "bg-black text-white"
                    : isAllValid
                    ? "bg-black text-white hover:bg-gray-800"
                    : "cursor-not-allowed bg-gray-100 text-gray-400"
                }`}
              >
                {copyFeedback ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 8L7 12L13 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span data-testid="copy-feedback">Copied</span>
                  </>
                ) : copyError ? (
                  <span data-testid="copy-error">Copy failed</span>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="2" y="2" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                      <path d="M5 5H13C13.5523 5 14 5.44772 14 6V13C14 13.5523 13.5523 14 13 14H6C5.44772 14 5 13.5523 5 13V5Z" stroke="currentColor" strokeWidth="1.2"/>
                    </svg>
                    Copy Result
                  </>
                )}
              </button>
              {!isAllValid && (
                <p className="text-[10px] text-gray-400 text-center mt-2">
                  Complete all variables to copy
                </p>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
