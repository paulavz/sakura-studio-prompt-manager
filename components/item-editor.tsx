"use client";

import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { VariableChip } from "./tiptap-variable-chip";
import { markdownToHtml, htmlToMarkdown } from "@/lib/markdown";

interface ItemEditorProps {
  mode: "rendered" | "raw";
  value: string;
  onChange: (md: string) => void;
  onClearError: () => void;
}

export function ItemEditor({ mode, value, onChange, onClearError }: ItemEditorProps) {
  const lastEmittedRef = useRef<string | null>(null);

  const editor = useEditor({
    extensions: [StarterKit, VariableChip],
    content: markdownToHtml(value),
    editable: true,
    immediatelyRender: false,
    editorProps: {
      // Always paste as plain text — Tiptap's HTML paste introduces unwanted
      // formatting (VS Code colors, doc fonts) that doesn't survive the
      // markdown round-trip cleanly.
      handlePaste: (view, event) => {
        event.preventDefault();
        const text = event.clipboardData?.getData("text/plain") || "";
        view.dispatch(view.state.tr.insertText(text));
        return true;
      },
    },
    onUpdate: ({ editor }) => {
      const md = htmlToMarkdown(editor.getHTML());
      lastEmittedRef.current = md;
      onChange(md);
      onClearError();
    },
  });

  // Sync editor when value changes from outside (cancel, restore, skill/agent injection).
  // Skip when the value matches what we just emitted (avoids double htmlToMarkdown).
  // Skip entirely in raw mode — the editor is hidden and the textarea owns the value.
  useEffect(() => {
    if (!editor || mode !== "rendered") return;
    if (lastEmittedRef.current === value) return;
    editor.commands.setContent(markdownToHtml(value), { emitUpdate: false });
    lastEmittedRef.current = value;
  }, [value, editor, mode]);

  if (mode === "rendered") {
    return (
      <div className="prose prose-sm max-w-none text-black">
        <EditorContent editor={editor} className="min-h-[400px]" />
      </div>
    );
  }

  return (
    <textarea
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
        onClearError();
      }}
      className="raw-pre"
    />
  );
}
