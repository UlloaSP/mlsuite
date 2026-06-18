/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { PluginDto } from "../../../plugin/api/pluginService";
import type { DetectedPluginType } from "../catalog-loader";

/**
 * SortMode: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: models plugin catalog page filters, labels, display metadata, and file/timestamp helpers.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export type SortMode = "updated" | "name";
/**
 * PluginViewType: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: models plugin catalog page filters, labels, display metadata, and file/timestamp helpers.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export type PluginViewType = DetectedPluginType | "invalid";
/**
 * TypeFilter: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: models plugin catalog page filters, labels, display metadata, and file/timestamp helpers.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export type TypeFilter = "all" | DetectedPluginType;

/**
 * PluginPageItem: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: models plugin catalog page filters, labels, display metadata, and file/timestamp helpers.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export type PluginPageItem = PluginDto & {
  pluginType: PluginViewType;
  kind: string | null;
};

/**
 * TypeMeta: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: models plugin catalog page filters, labels, display metadata, and file/timestamp helpers.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export type TypeMeta = {
  label: string;
  shortLabel: string;
  tone: "accent" | "success" | "warning" | "danger";
  plural: string;
};

/**
 * SORT_LABELS: exposes a stable constant used by this algorithm.
 *
 * Purpose: models plugin catalog page filters, labels, display metadata, and file/timestamp helpers.
 * @returns Stable constant value shared by callers.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const SORT_LABELS: Record<SortMode, string> = {
  updated: "Latest updated",
  name: "Name",
};

/**
 * TYPE_META: exposes a stable constant used by this algorithm.
 *
 * Purpose: models plugin catalog page filters, labels, display metadata, and file/timestamp helpers.
 * @returns Stable constant value shared by callers.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const TYPE_META: Record<PluginViewType, TypeMeta> = {
  field: { label: "Field", shortLabel: "field", tone: "accent", plural: "fields" },
  report: { label: "Report", shortLabel: "report", tone: "warning", plural: "reports" },
  invalid: { label: "Invalid", shortLabel: "invalid", tone: "danger", plural: "invalid plugins" },
};

/**
 * readFileText: reads a value from nested records using supported aliases
 *
 * Purpose: models plugin catalog page filters, labels, display metadata, and file/timestamp helpers.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const readFileText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error ?? new Error("Could not read selected file."));
    reader.readAsText(file);
  });

/**
 * formatTimestamp: converts raw data into a stable human-readable string
 *
 * Purpose: models plugin catalog page filters, labels, display metadata, and file/timestamp helpers.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const formatTimestamp = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};
