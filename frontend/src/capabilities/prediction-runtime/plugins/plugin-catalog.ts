/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
  detectPluginType,
  type DetectedPluginType,
} from "@/capabilities/prediction-runtime/plugins/plugin-catalog-loader";
import {
  resolveCustomFieldDefinition,
  type CustomFieldKind,
} from "@/capabilities/prediction-runtime/plugins/custom-field-source-runtime";
import {
  resolveCustomReportDefinition,
  type CustomReportKind,
} from "@/capabilities/prediction-runtime/plugins/custom-report-source-runtime";
import type {
  PluginCatalog,
  PluginCatalogEntry,
} from "@/capabilities/prediction-runtime/sandbox/sandbox-protocol";

export type CatalogFieldDefinition = PluginCatalogEntry & { definition: CustomFieldKind };

export type CatalogReportDefinition = PluginCatalogEntry & { definition: CustomReportKind };

/** A catalog compiled inside the plugin sandbox, the only place its definitions exist. */
export type PredictionCatalogDefinitions = {
  fieldDefinitions: readonly CatalogFieldDefinition[];
  reportDefinitions: readonly CatalogReportDefinition[];
};

type PluginSource = { fileName: string; source: string };

const assertUniqueKinds = (
  plugin: DetectedPluginType,
  entries: readonly { kind: string; fileName: string }[],
): void => {
  const seenKinds = new Map<string, string>();
  for (const entry of entries) {
    const previous = seenKinds.get(entry.kind);
    if (previous) {
      throw new Error(
        `Duplicate custom ${plugin} kind "${entry.kind}" in catalog (${previous}, ${entry.fileName}).`,
      );
    }
    seenKinds.set(entry.kind, entry.fileName);
  }
};

/** Detects each source's plugin type and kind, in order; two plugins of one kind break the catalog. */
export const inspectPluginSources = async (sources: readonly PluginSource[]) => {
  const detected = await Promise.all(sources.map((item) => detectPluginType(item.source)));
  const named = detected.map((item, index) => ({ ...item, fileName: sources[index].fileName }));
  assertUniqueKinds(
    "field",
    named.filter((item) => item.pluginType === "field"),
  );
  assertUniqueKinds(
    "report",
    named.filter((item) => item.pluginType === "report"),
  );
  return detected;
};

/** Compiles an inspected catalog: its fields as field kinds and its reports as report kinds. */
export const compilePluginCatalog = async (
  catalog: PluginCatalog,
): Promise<PredictionCatalogDefinitions> => {
  const [fieldDefinitions, reportDefinitions] = await Promise.all([
    Promise.all(
      catalog.fields.map(async (entry) => {
        const definition = await resolveCustomFieldDefinition(entry.source);
        return { ...entry, kind: definition.kind, definition };
      }),
    ),
    Promise.all(
      catalog.reports.map(async (entry) => {
        const definition = await resolveCustomReportDefinition(entry.source);
        return { ...entry, kind: definition.kind, definition };
      }),
    ),
  ]);
  assertUniqueKinds("field", fieldDefinitions);
  assertUniqueKinds("report", reportDefinitions);
  return { fieldDefinitions, reportDefinitions };
};
