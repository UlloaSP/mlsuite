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

export type CatalogFieldDefinition = Pick<
  PluginDto,
  "id" | "fileName" | "source" | "updatedAt" | "createdAt" | "contentType" | "sizeBytes"
> & {
  kind: string;
  definition: DefinedFieldKind<FieldConfig, unknown>;
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
    kind: detected.kind,
    definition: await resolveCustomFieldDefinition(item.source),
  };
};

export const invalidateCustomFieldDefinitions = (): void => {
  catalogDefinitionsPromise = null;
  invalidatePluginCatalog();
};

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
