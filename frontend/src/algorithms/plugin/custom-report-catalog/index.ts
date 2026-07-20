/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportConfig } from "mlform/runtime";
import type { DefinedReportKind } from "mlform/kit";
import type { PluginDto } from "@/features/plugins/api/plugin.types";
import { detectPluginType, loadPlugins } from "@/algorithms/plugin/catalog-loader";
import {
  CUSTOM_REPORT_COMPONENT,
  resolveCustomReportDefinition,
} from "@/algorithms/plugin/custom-report-source-runtime";
import { memoizePluginRuntime } from "@/capabilities/mlform/plugin-runtime-cache";

export { CUSTOM_REPORT_COMPONENT };

/**
 * CatalogReportDefinition: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: materializes custom report definitions from plugin catalog source rows.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Propagates browser/API/runtime failures from the called platform APIs.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export type CatalogReportDefinition = Pick<
  PluginDto,
  "id" | "fileName" | "source" | "updatedAt" | "createdAt" | "contentType" | "sizeBytes"
> & {
  kind: string;
  definition: DefinedReportKind<ReportConfig, unknown>;
};

/** assertUniqueKinds: internal helper for plugin catalog/runtime source handling. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
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

/** toCatalogDefinition: internal normalization helper for plugin catalog/runtime source handling. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const toCatalogDefinition = async (
  organizationId: number | string,
  item: PluginDto,
): Promise<CatalogReportDefinition | null> => {
  const detected = await detectPluginType(organizationId, item.source);
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
    kind: detected.kind,
    definition: await resolveCustomReportDefinition(organizationId, item.source),
  };
};

/**
 * getCustomReportDefinitions: extracts a derived value without mutating input
 *
 * Purpose: materializes custom report definitions from plugin catalog source rows.
 * @param await Promise.all(items.map((item - Input consumed by getCustomReportDefinitions; uses the materializes custom report definitions from plugin catalog source rows contract.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const getCustomReportDefinitions = (
  organizationId: number | string,
): Promise<readonly CatalogReportDefinition[]> =>
  memoizePluginRuntime(organizationId, "report-definitions", () =>
    loadPlugins(organizationId).then(async (items) => {
      const definitions = (
        await Promise.all(items.map((item) => toCatalogDefinition(organizationId, item)))
      ).filter((definition): definition is CatalogReportDefinition => definition !== null);
      assertUniqueKinds(definitions);
      return definitions;
    }),
  );
