export type ItemCategory =
  | "template"
  | "plan"
  | "report"
  | "output"
  | "messaging"
  | "agente"
  | "skill";

export interface AppliedSkill {
  id: string;
  name: string;
}

export interface Item {
  id: string;
  title: string;
  content: string;
  category: ItemCategory;
  tags: string[];
  applied_skills: AppliedSkill[];
  is_favorite: boolean;
  owner: string;
  created_at: string;
  updated_at: string;
}

// Labels displayed in UI dropdowns and headers.
export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  template: "Templates",
  plan: "Plans",
  report: "Reports",
  output: "Outputs",
  messaging: "Messaging",
  agente: "Agents",
  skill: "Skills",
};

// Order in which categories appear in the New Prompt dropdown and sidebar.
// 7 entries: 5 Workspace + Agents + Skills.
export const CATEGORIES: ItemCategory[] = [
  "template", "plan", "report", "output", "messaging",
  "agente", "skill",
];

// Icons taken from design v4 sidebar (unicode glyphs).
export const CATEGORY_ICONS: Record<ItemCategory, string> = {
  template: "▦",
  plan: "◐",
  report: "▤",
  output: "⬚",
  messaging: "✉",
  agente: "◇",
  skill: "✦",
};

// Visual grouping for the sidebar.
// Workspace = the 5 promoted categories.
// Agents / Skills get their own section, matching the v4 design.
export const WORKSPACE_CATEGORIES: ItemCategory[] = [
  "template", "plan", "report", "output", "messaging",
];
