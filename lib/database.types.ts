export type ItemCategory = "template" | "agente" | "skill";

export type TemplateSubcategory = "Planes" | "Test" | "Debug" | "n8n";

export interface AppliedSkill {
  id: string;
  name: string;
}

export interface Item {
  id: string;
  title: string;
  content: string;
  category: ItemCategory;
  subcategory: string | null;
  tags: string[];
  applied_skills: AppliedSkill[];
  is_favorite: boolean;
  owner: string;
  created_at: string;
  updated_at: string;
}

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  template: "Templates",
  agente: "Agents",
  skill: "Skills",
};

export const CATEGORIES: ItemCategory[] = ["template", "agente", "skill"];

export const TEMPLATE_SUBCATEGORIES: TemplateSubcategory[] = [
  "Planes",
  "Test",
  "Debug",
  "n8n",
];
