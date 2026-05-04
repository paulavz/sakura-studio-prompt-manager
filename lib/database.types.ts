export type ItemCategory =
  | "template"
  | "plan"
  | "data_output"
  | "agente"
  | "skill";

export interface Item {
  id: string;
  title: string;
  content: string;
  category: ItemCategory;
  tags: string[];
  is_favorite: boolean;
  owner: string;
  created_at: string;
  updated_at: string;
}

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  template: "Templates",
  plan: "Planes",
  data_output: "Salida de data",
  agente: "Agentes",
  skill: "Skills",
};

export const CATEGORIES: ItemCategory[] = [
  "template",
  "plan",
  "data_output",
  "agente",
  "skill",
];
