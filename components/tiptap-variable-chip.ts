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
      {
        tag: "span.variable-chip",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(
        {
          "data-testid": "variable-chip",
          class: "variable-chip",
        },
        HTMLAttributes
      ),
      0,
    ];
  },
});
