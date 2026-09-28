/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type {
  PluginCatalogSort,
  PluginCatalogType,
  PluginDto,
} from "@/features/plugins/api/plugin.types";
import type { DetectedPluginType } from "@/capabilities/prediction-runtime/plugins/plugin-catalog-loader";

export type SortMode = PluginCatalogSort;
export type PluginViewType = DetectedPluginType | "invalid";
export type TypeFilter = PluginCatalogType;

export type PluginPageItem = PluginDto & {
  pluginType: PluginViewType;
  kind: string | null;
};

export type TypeMeta = {
  label: string;
  shortLabel: string;
  tone: "accent" | "success" | "warning" | "danger";
  plural: string;
};

export const SORT_LABELS: Record<SortMode, string> = {
  updated: "Latest updated",
  name: "Name",
};

export const TYPE_META: Record<PluginViewType, TypeMeta> = {
  field: { label: "Field", shortLabel: "field", tone: "accent", plural: "fields" },
  report: { label: "Report", shortLabel: "report", tone: "warning", plural: "reports" },
  invalid: { label: "Invalid", shortLabel: "invalid", tone: "danger", plural: "invalid plugins" },
};
