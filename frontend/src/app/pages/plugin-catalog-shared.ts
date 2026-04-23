/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { PluginDto } from "../api/pluginService";
import type { DetectedPluginType } from "../utils/mlform/plugin-catalog";

export type FilterMode = "all" | "active" | "inactive";
export type SortMode = "updated" | "name" | "size";
export type PluginViewType = DetectedPluginType | "invalid";
export type TypeFilter = "all" | DetectedPluginType;

export type PluginPageItem = PluginDto & {
	pluginType: PluginViewType;
	uniqueKey: string;
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
	size: "Size",
};

export const TYPE_META: Record<PluginViewType, TypeMeta> = {
	field: { label: "Field", shortLabel: "field", tone: "accent", plural: "fields" },
	report: { label: "Report", shortLabel: "report", tone: "warning", plural: "reports" },
	explanation: {
		label: "Explanation",
		shortLabel: "explanation",
		tone: "success",
		plural: "explanations",
	},
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

export const formatSize = (value: number): string => {
	if (value < 1024) {
		return `${value} B`;
	}
	if (value < 1024 * 1024) {
		return `${(value / 1024).toFixed(1)} KB`;
	}
	return `${(value / (1024 * 1024)).toFixed(2)} MB`;
};
