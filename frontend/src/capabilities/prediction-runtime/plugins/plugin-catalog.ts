/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { detectPluginType } from "@/capabilities/prediction-runtime/plugins/plugin-catalog-loader";
import {
  resolveCustomFieldDefinition,
  type CustomFieldKind,
} from "@/capabilities/prediction-runtime/plugins/custom-field-source-runtime";
import {
  resolveCustomReportDefinition,
  type CustomReportKind,
} from "@/capabilities/prediction-runtime/plugins/custom-report-source-runtime";
import type { PluginRuntimeSourceDto } from "@/shared/api/openapi.gen";

export type CatalogFieldDefinition = PluginRuntimeSourceDto & {
  kind: string;
  definition: CustomFieldKind;
};

export type CatalogReportDefinition = PluginRuntimeSourceDto & {
  kind: string;
  definition: CustomReportKind;
};

export type PredictionCatalogDefinitions = {
  fieldDefinitions: readonly CatalogFieldDefinition[];
  reportDefinitions: readonly CatalogReportDefinition[];
};

const assertUniqueKinds = (
  plugin: "field" | "report",
  definitions: readonly { kind: string; fileName: string }[],
): void => {
  const seenKinds = new Map<string, string>();
  for (const definition of definitions) {
    const previous = seenKinds.get(definition.kind);
    if (previous) {
      throw new Error(
        `Duplicate custom ${plugin} kind "${definition.kind}" in catalog (${previous}, ${definition.fileName}).`,
      );
    }
    seenKinds.set(definition.kind, definition.fileName);
  }
};

/** Detects each source's plugin type once and splits the catalog into fields and reports. */
export const getCatalogDefinitions = async (
  organizationId: number | string,
  sources: readonly PluginRuntimeSourceDto[],
): Promise<PredictionCatalogDefinitions> => {
  const entries = await Promise.all(
    sources.map(async (item) => {
      const { pluginType, kind } = await detectPluginType(organizationId, item.source);
      return pluginType === "field"
        ? ({
            pluginType,
            entry: {
              ...item,
              kind,
              definition: await resolveCustomFieldDefinition(organizationId, item.source),
            },
          } as const)
        : ({
            pluginType,
            entry: {
              ...item,
              kind,
              definition: await resolveCustomReportDefinition(organizationId, item.source),
            },
          } as const);
    }),
  );
  const fieldDefinitions = entries.flatMap((item) =>
    item.pluginType === "field" ? [item.entry] : [],
  );
  const reportDefinitions = entries.flatMap((item) =>
    item.pluginType === "report" ? [item.entry] : [],
  );
  assertUniqueKinds("field", fieldDefinitions);
  assertUniqueKinds("report", reportDefinitions);
  return { fieldDefinitions, reportDefinitions };
};
