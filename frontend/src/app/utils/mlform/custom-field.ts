/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { FieldConfig, FieldDefinition } from "mlform/runtime";
import type { PluginDto } from "../../api/pluginService";
import { detectPluginType, invalidatePluginCatalog, loadPlugins } from "./plugin-catalog";
import {
	CUSTOM_FIELD_COMPONENT,
	customFieldTemplate,
	resolveCustomFieldDefinition,
	validateCustomFieldSource,
} from "./custom-field-runtime";

export { CUSTOM_FIELD_COMPONENT, customFieldTemplate, validateCustomFieldSource };

export type CatalogFieldDefinition = Pick<
	PluginDto,
	"id" | "fileName" | "source" | "updatedAt" | "createdAt" | "contentType" | "sizeBytes" | "active"
> & {
	kind: string;
	definition: FieldDefinition<FieldConfig, unknown>;
};

let catalogDefinitionsPromise: Promise<CatalogFieldDefinition[]> | null = null;

const assertUniqueKinds = (definitions: readonly CatalogFieldDefinition[]): void => {
	const seenKinds = new Map<string, string>();
	for (const definition of definitions) {
		const previous = seenKinds.get(definition.kind);
		if (previous) {
			throw new Error(
				`Duplicate custom field kind "${definition.kind}" in catalog (${previous}, ${definition.fileName}).`,
			);
		}
		seenKinds.set(definition.kind, definition.fileName);
	}
};

const toCatalogDefinition = async (item: PluginDto): Promise<CatalogFieldDefinition | null> => {
	const detected = await detectPluginType(item.source);
	if (detected.pluginType !== "field") {
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
		definition: await resolveCustomFieldDefinition(item.source),
	};
};

export const invalidateActiveCustomFieldDefinition = (): void => {
	catalogDefinitionsPromise = null;
	invalidatePluginCatalog();
};

export const getCatalogFieldDefinitions = async (): Promise<readonly CatalogFieldDefinition[]> => {
	catalogDefinitionsPromise ??= loadPlugins().then(async (items) => {
		const definitions = (await Promise.all(items.map((item) => toCatalogDefinition(item)))).filter(
			(definition): definition is CatalogFieldDefinition => definition !== null,
		);
		assertUniqueKinds(definitions);
		return definitions;
	});
	return catalogDefinitionsPromise;
};

export const getActiveCustomFieldDefinitions = async (): Promise<
	readonly CatalogFieldDefinition[]
> => {
	const catalogDefinitions = await getCatalogFieldDefinitions();
	return catalogDefinitions.filter((definition) => definition.active);
};
