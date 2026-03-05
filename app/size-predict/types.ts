/**
 * Size prediction feature: types and constants.
 * All future changes to this feature should live under app/size-predict/.
 */

export type MappingRow = {
  sizeName: string;
  heightMin: number;
  heightMax: number;
  weightMin: number;
  weightMax: number;
};

export const DEFAULT_SIZES = ["S", "M", "L", "XL"];

export const DEFAULT_MAPPINGS: MappingRow[] = [
  { sizeName: "S", heightMin: 0, heightMax: 0, weightMin: 0, weightMax: 0 },
  { sizeName: "M", heightMin: 0, heightMax: 0, weightMin: 0, weightMax: 0 },
  { sizeName: "L", heightMin: 0, heightMax: 0, weightMin: 0, weightMax: 0 },
  { sizeName: "XL", heightMin: 0, heightMax: 0, weightMin: 0, weightMax: 0 },
];

/** Default size chart with example ranges (S, M, L, XL) for initial display. */
export const DEFAULT_CHART_WITH_RANGES: MappingRow[] = [
  { sizeName: "S", heightMin: 150, heightMax: 160, weightMin: 45, weightMax: 55 },
  { sizeName: "M", heightMin: 161, heightMax: 170, weightMin: 56, weightMax: 65 },
  { sizeName: "L", heightMin: 171, heightMax: 180, weightMin: 66, weightMax: 75 },
  { sizeName: "XL", heightMin: 181, heightMax: 190, weightMin: 76, weightMax: 90 },
];

export function scopeLabel(scopeType: string, scopeValue: string | null): string {
  if (scopeType === "all") return "All products";
  if (scopeType === "manual") return "Manual selection";
  if (scopeType === "product_type") return `Specific condition: ${scopeValue || "—"}`;
  if (scopeType === "collection") return `Collection: ${scopeValue || "—"}`;
  if (scopeType === "product") return `Product: ${scopeValue || "—"}`;
  return scopeType;
}

export type ScopeType = "all" | "manual" | "product_type" | "collection" | "product";

export type SizePredictRule = {
  id: string;
  name: string;
  scopeType: string;
  scopeValue: string;
  status: string;
  sizes: string[];
  mappings: MappingRow[];
};

export type SizePredictSettings = {
  widgetEnabled: boolean;
  buttonLabel: string;
  helperText: string;
  heightUnit: string;
  weightUnit: string;
  autoSelectSize: boolean;
};

export type SizePredictLoaderData = {
  settings: SizePredictSettings;
  rules: SizePredictRule[];
  products: Array<{ id: string; title: string }>;
  collections: Array<{ id: string; title: string }>;
};

/** Returns set of row indices that overlap (height or weight range) with another row. */
export function getOverlapWarningIndices(mappings: MappingRow[]): Set<number> {
  const overlapping = new Set<number>();
  for (let i = 0; i < mappings.length; i++) {
    const a = mappings[i];
    for (let j = i + 1; j < mappings.length; j++) {
      const b = mappings[j];
      const heightOverlap =
        a.heightMin <= b.heightMax && b.heightMin <= a.heightMax;
      const weightOverlap =
        a.weightMin <= b.weightMax && b.weightMin <= a.weightMax;
      if (heightOverlap || weightOverlap) {
        overlapping.add(i);
        overlapping.add(j);
      }
    }
  }
  return overlapping;
}
