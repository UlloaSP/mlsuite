/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { FieldConfig } from "mlform/runtime";
import type { DefinedFieldKind } from "mlform/kit";
import type { PluginDto } from "../../../plugin/api/pluginService";
import { detectPluginType, invalidatePluginCatalog, loadPlugins } from "../catalog-loader";
import {
  CUSTOM_FIELD_COMPONENT,
  resolveCustomFieldDefinition,
} from "../custom-field-source-runtime";

export { CUSTOM_FIELD_COMPONENT };

/**
 * CatalogFieldDefinition: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: materializes custom field definitions from plugin catalog source rows.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Propagates browser/API/runtime failures from the called platform APIs.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export type CatalogFieldDefinition = Pick<
  PluginDto,
  "id" | "fileName" | "source" | "updatedAt" | "createdAt" | "contentType" | "sizeBytes"
> & {
  kind: string;
  definition: DefinedFieldKind<FieldConfig, unknown>;
};

let catalogDefinitionsPromise: Promise<CatalogFieldDefinition[]> | null = null;

/** assertUniqueKinds: internal helper for plugin catalog/runtime source handling. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
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

/** toCatalogDefinition: internal normalization helper for plugin catalog/runtime source handling. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
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
    kind: detected.kind,
    definition: await resolveCustomFieldDefinition(item.source),
  };
};

/**
 * invalidateCustomFieldDefinitions: clears cached state so next read reloads source data
 *
 * Purpose: materializes custom field definitions from plugin catalog source rows.
 * @returns void after cache invalidation.
 * @throws Error when required schema/plugin/model mapping data is missing, malformed, or unsupported.
 * @remarks Side cases/effects: Mutates in-memory cache only; next read recomputes from source data.
 */
export const invalidateCustomFieldDefinitions = (): void => {
  catalogDefinitionsPromise = null;
  invalidatePluginCatalog();
};

/**
 * getCustomFieldDefinitions: extracts a derived value without mutating input
 *
 * Purpose: materializes custom field definitions from plugin catalog source rows.
 * @param await Promise.all(items.map((item - Input consumed by getCustomFieldDefinitions; uses the materializes custom field definitions from plugin catalog source rows contract.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const getCustomFieldDefinitions = async (): Promise<readonly CatalogFieldDefinition[]> => {
  catalogDefinitionsPromise ??= loadPlugins().then(async (items) => {
    const definitions = (await Promise.all(items.map((item) => toCatalogDefinition(item)))).filter(
      (definition): definition is CatalogFieldDefinition => definition !== null,
    );
    assertUniqueKinds(definitions);
    return definitions;
  });
  return catalogDefinitionsPromise;
};
