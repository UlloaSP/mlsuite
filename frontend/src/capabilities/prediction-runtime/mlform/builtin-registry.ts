/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { createBuiltinMlRegistry } from "mlform/builtins";
import type { FieldConfig, FieldDefinition, ReportConfig, ReportDefinition } from "mlform/runtime";
import { isRecord } from "./shared";

export const createMlSuiteRegistry = () => {
  const registry = createBuiltinMlRegistry();
  const series = registry.getField("series")!;
  registry.unregisterField("series").registerField({
    ...series,
    serializeValue(value, config) {
      const rows = series.serializeValue?.(value, config);
      if (!Array.isArray(rows) || !Array.isArray(config.columns)) return rows;
      // Converted pair schemas keep the date-only payload expected by their trained models.
      const dates = config.columns
        .filter(isRecord)
        .filter((column) => column.kind === "date" && column.dateSerialization === "date-only");
      if (!dates.length) return rows;
      return rows.map((row) => {
        if (!isRecord(row)) return row;
        const serialized = { ...row };
        for (const column of dates) {
          if (typeof column.id !== "string") continue;
          const date = serialized[column.id];
          if (typeof date === "string") serialized[column.id] = date.slice(0, 10);
        }
        return serialized;
      });
    },
  });
  return registry;
};

/** Stable registry supplied by MLForm's built-ins. */
const builtinRegistry = createMlSuiteRegistry();

export const getBuiltinRegistry = () => builtinRegistry;

const BUILTIN_FIELD_DEFINITIONS = builtinRegistry.listFields() as FieldDefinition<
  FieldConfig,
  unknown
>[];
const BUILTIN_REPORT_DEFINITIONS =
  builtinRegistry.listReports() as ReportDefinition<ReportConfig>[];

const BUILTIN_FIELD_KINDS = BUILTIN_FIELD_DEFINITIONS.map((definition) => definition.kind);
const BUILTIN_REPORT_KINDS = BUILTIN_REPORT_DEFINITIONS.map((definition) => definition.kind);
const builtinFieldKindSet = new Set(BUILTIN_FIELD_KINDS);
const builtinReportKindSet = new Set(BUILTIN_REPORT_KINDS);

export const isBuiltinFieldKind = (kind: string): boolean => builtinFieldKindSet.has(kind);

export const isBuiltinReportKind = (kind: string): boolean => builtinReportKindSet.has(kind);

export const builtinFieldKindsDisplay = (): string =>
  BUILTIN_FIELD_KINDS.map((kind) => `"${kind}"`).join(" | ");
