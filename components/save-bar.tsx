"use client";

import { motion, AnimatePresence } from "framer-motion";

interface SaveBarProps {
  visible: boolean;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

export function SaveBar({ visible, onSave, onCancel, isSaving }: SaveBarProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          data-testid="save-bar"
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200"
          style={{
            boxShadow: "0 -2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <div className="flex items-center justify-end gap-3 px-6 py-3 max-w-none">
            <button
              onClick={onCancel}
              disabled={isSaving}
              className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={isSaving}
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
