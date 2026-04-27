/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportConfig, ReportDefinition } from "mlform/engine";
import type { PluginDto } from "../../api/pluginService";
import { detectPluginType, invalidatePluginCatalog, loadPlugins } from "./plugin-catalog";
import {
	CUSTOM_REPORT_COMPONENT,
	customReportTemplate,
	resolveCustomReportDefinition,
	validateCustomReportSource,
} from "./custom-report-runtime";

export { CUSTOM_REPORT_COMPONENT, customReportTemplate, validateCustomReportSource };

export type CatalogReportDefinition = Pick<
	PluginDto,
	"id" | "fileName" | "source" | "updatedAt" | "createdAt" | "contentType" | "sizeBytes" | "active"
> & {
	kind: string;
	definition: ReportDefinition<ReportConfig>;
};

let catalogDefinitionsPromise: Promise<CatalogReportDefinition[]> | null = null;

const assertUniqueKinds = (definitions: readonly CatalogReportDefinition[]): void => {
	const seenKinds = new Map<string, string>();
	for (const definition of definitions) {
		const previous = seenKinds.get(definition.kind);
		if (previous) {
			throw new Error(
				`Duplicate custom report kind "${definition.kind}" in catalog (${previous}, ${definition.fileName}).`,
			);
		}
		seenKinds.set(definition.kind, definition.fileName);
	}
};

const toCatalogDefinition = async (item: PluginDto): Promise<CatalogReportDefinition | null> => {
	const detected = await detectPluginType(item.source);
	if (detected.pluginType !== "report") {
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
		definition: await resolveCustomReportDefinition(item.source),
	};
};

export const invalidateActiveCustomReportDefinition = (): void => {
	catalogDefinitionsPromise = null;
	invalidatePluginCatalog();
};

export const getCatalogReportDefinitions = async (): Promise<readonly CatalogReportDefinition[]> => {
	catalogDefinitionsPromise ??= loadPlugins().then(async (items) => {
		const definitions = (await Promise.all(items.map((item) => toCatalogDefinition(item)))).filter(
			(definition): definition is CatalogReportDefinition => definition !== null,
		);
		assertUniqueKinds(definitions);
		return definitions;
	});
	return catalogDefinitionsPromise;
};

export const getActiveCustomReportDefinitions = async (): Promise<
	readonly CatalogReportDefinition[]
> => {
	const catalogDefinitions = await getCatalogReportDefinitions();
	return catalogDefinitions.filter((definition) => definition.active);
};
