export type PackingCategory =
  | "Essentials"
  | "Clothing"
  | "Electronics"
  | "Activities"
  | "Weather"
  | "Other";

export type Importance = "essential" | "recommended" | "optional";

export interface PackingItem {
  id: string;
  trip_id: string;
  name: string;
  category: PackingCategory;
  is_packed: boolean;
  importance: Importance;
  reason: string | null;
  created_at: string;
}

export interface GeneratedPackingItem {
  name: string;
  category: PackingCategory;
  importance: Importance;
  reason: string | null;
}

export const CATEGORY_ORDER: PackingCategory[] = [
  "Essentials",
  "Clothing",
  "Electronics",
  "Activities",
  "Weather",
  "Other",
];

export interface FinalCheckWarning {
  id: string;
  title: string;
  message: string;
}
