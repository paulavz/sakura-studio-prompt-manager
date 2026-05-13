import { Mark, mergeAttributes } from "@tiptap/core";

export interface VariableChipOptions {
  HTMLAttributes: Record<string, string | number | undefined>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    variableChip: {
      setVariableChip: () => ReturnType;
      unsetVariableChip: () => ReturnType;
    };
  }
}

export const VariableChip = Mark.create<VariableChipOptions>({
  name: "variableChip",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-testid="variable-chip"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(
        {
          "data-testid": "variable-chip",
          style:
            "display:inline-flex;align-items:center;border-radius:0.25rem;padding:0.125rem 0.375rem;font-size:0.75rem;background-color:var(--color-sakura-20);border:1px solid var(--color-sakura-50);color:var(--color-variable-text);font-family:var(--font-mono);",
        },
        HTMLAttributes
      ),
      0,
    ];
  },
});
