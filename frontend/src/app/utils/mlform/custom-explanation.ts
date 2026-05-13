/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ExplanationConfig, ExplanationDefinition } from "mlform/runtime";
import type { PluginDto } from "../../api/pluginService";
import {
	type ExplanationDefinitionWithFeedback,
	resolveCustomExplanationDefinitionWithFeedback,
} from "./custom-explanation-questionnaire";
import { detectPluginType, invalidatePluginCatalog, loadActivePlugins } from "./plugin-catalog";
import { normalizeCustomExplanationResult } from "./custom-explanation-result";

export { normalizeCustomExplanationResult };

export type CatalogExplanationDefinition = Pick<
	PluginDto,
	"id" | "fileName" | "source" | "updatedAt" | "createdAt" | "contentType" | "sizeBytes" | "active"
> & {
	kind: string;
	definition: ExplanationDefinitionWithFeedback;
};

const assertUniqueKinds = (definitions: readonly CatalogExplanationDefinition[]): void => {
	const seenKinds = new Map<string, string>();
	for (const definition of definitions) {
		const previous = seenKinds.get(definition.kind);
		if (previous) {
			throw new Error(
				`Duplicate custom explanation kind "${definition.kind}" in catalog (${previous}, ${definition.fileName}).`,
			);
		}
		seenKinds.set(definition.kind, definition.fileName);
	}
};

const toCatalogDefinition = async (item: PluginDto): Promise<CatalogExplanationDefinition | null> => {
	const detected = await detectPluginType(item.source);
	if (detected.pluginType !== "explanation") {
		return null;
	}
	return {
		id: item.id,
		fileName: item.fileName,
		source: item.source,
		updatedAt: item.updatedAt,
		createdAt: item.createdAt,
		contentType: item.contentType,
		sizeBytes: item.sizeBytes,
		active: item.active,
		kind: detected.kind,
		definition: await resolveCustomExplanationDefinitionWithFeedback(item.source) as ExplanationDefinition<ExplanationConfig> & ExplanationDefinitionWithFeedback,
	};
};

export const invalidateActiveCustomExplanationDefinition = (): void => {
	invalidatePluginCatalog();
};

export const getActiveCustomExplanationDefinitions = async (): Promise<
	readonly CatalogExplanationDefinition[]
> => {
	const items = await loadActivePlugins();
	const settled = await Promise.all(
		items.map(async (item) => {
			try {
				return await toCatalogDefinition(item);
			} catch (error: unknown) {
				console.warn(
					`Skipping explanation plugin "${item.fileName}" (${item.id}): ${
						error instanceof Error ? error.message : String(error)
					}`,
				);
				return null;
			}
		}),
	);
	const definitions = settled.filter(
		(definition): definition is CatalogExplanationDefinition => definition !== null,
	);
	assertUniqueKinds(definitions);
	return definitions;
};
