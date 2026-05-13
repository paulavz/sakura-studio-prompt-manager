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

  const handleCopy = async () => {
    const result = replaceVariables(content, values);
    try {
      await navigator.clipboard.writeText(result);
      setCopyFeedback(true);
      setCopyError(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopyFeedback(false), 2000);
    } catch {
      setCopyError(true);
      setCopyFeedback(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopyError(false), 2000);
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
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm md:max-w-md flex-col border-l border-gray-200 bg-white shadow-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-sm font-semibold text-black">Use Template</h2>
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
                    return (
                      <div key={name} className="flex flex-col gap-1.5">
                        <label
                          htmlFor={inputId}
                          className="text-xs font-medium text-gray-700"
                        >
                          {name}
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
                            error
                              ? "border-red-300 focus:ring-red-300"
                              : "border-gray-200 focus:ring-gray-300"
                          }`}
                          placeholder={`Value for ${name}…`}
                          style={{
                            background: value
                              ? "var(--color-sakura-6)"
                              : undefined,
                          }}
                        />
                        {error && (
                          <span
                            data-testid="var-error"
                            className="text-xs text-red-500"
                          >
                            {error}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400 self-end">
                          {value.length} / {maxVarLength}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4">
              <button
                onClick={handleCopy}
                disabled={!isAllValid}
                className={`relative w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  isAllValid
                    ? "bg-black text-white hover:bg-gray-800"
                    : "cursor-not-allowed bg-gray-100 text-gray-400"
                }`}
              >
                {copyFeedback ? (
                  <span data-testid="copy-feedback">✓ Copied</span>
                ) : copyError ? (
                  <span data-testid="copy-error">Copy failed</span>
                ) : (
                  "Copy Result"
                )}
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
