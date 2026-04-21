/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { getActivePlugins, getPlugins, type PluginDto } from "../../api/pluginService";
import { validateCustomExplanationSource } from "./custom-explanation-runtime";
import { validateCustomFieldSource } from "./custom-field-runtime";
import { validateCustomReportSource } from "./custom-report-runtime";

export type DetectedPluginType = "field" | "report" | "explanation";

export type PluginCatalogItem = PluginDto & {
	pluginType: DetectedPluginType;
	kind: string;
};

type DetectionResult = {
	pluginType: DetectedPluginType;
	kind: string;
};

let allPluginsPromise: Promise<PluginDto[]> | null = null;
let activePluginsPromise: Promise<PluginDto[]> | null = null;
const detectionCache = new Map<string, Promise<DetectionResult>>();

export const invalidatePluginCatalog = (): void => {
	allPluginsPromise = null;
	activePluginsPromise = null;
	detectionCache.clear();
};

export const loadPlugins = async (): Promise<readonly PluginDto[]> => {
	allPluginsPromise ??= getPlugins();
	return allPluginsPromise;
};

export const loadActivePlugins = async (): Promise<readonly PluginDto[]> => {
	activePluginsPromise ??= getActivePlugins();
	return activePluginsPromise;
};

export const detectPluginType = async (source: string): Promise<DetectionResult> => {
	const cacheKey = source;
	let detection = detectionCache.get(cacheKey);
	if (!detection) {
		detection = (async () => {
			const attempts = await Promise.allSettled([
				validateCustomFieldSource(source),
				validateCustomReportSource(source),
				validateCustomExplanationSource(source),
			]);
			if (attempts[0].status === "fulfilled") {
				return { pluginType: "field", kind: attempts[0].value.kind };
			}
			if (attempts[1].status === "fulfilled") {
				return { pluginType: "report", kind: attempts[1].value.kind };
			}
			if (attempts[2].status === "fulfilled") {
				return { pluginType: "explanation", kind: attempts[2].value.kind };
			}
			const reasons = attempts
				.map((attempt) =>
					attempt.status === "rejected"
						? attempt.reason instanceof Error
							? attempt.reason.message
							: String(attempt.reason)
						: null,
				)
				.filter((reason): reason is string => Boolean(reason));
			throw new Error(
				reasons.length > 0
					? `Plugin validation failed for field/report/explanation: ${reasons.join(" | ")}`
					: "Plugin validation failed. The file is not a valid field, report, or explanation plugin.",
			);
		})();
		detectionCache.set(cacheKey, detection);
	}
	return detection;
};

export const splitPluginCatalogByType = (items: readonly PluginCatalogItem[]) => ({
	field: items.filter((item) => item.pluginType === "field"),
	report: items.filter((item) => item.pluginType === "report"),
	explanation: items.filter((item) => item.pluginType === "explanation"),
});
