/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { PluginDto } from "../api/pluginService";
import type { DetectedPluginType } from "../mlform/plugin-catalog";

export type SortMode = "updated" | "name";
export type PluginViewType = DetectedPluginType | "invalid";
export type TypeFilter = "all" | DetectedPluginType;

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

export const readFileText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error ?? new Error("Could not read selected file."));
    reader.readAsText(file);
  });

export const formatTimestamp = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};
