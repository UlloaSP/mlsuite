/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { createBuiltinMlRegistry } from "mlform/builtins";
import type { FieldConfig, FieldDefinition, ReportConfig, ReportDefinition } from "mlform/runtime";

/** Stable registry supplied by MLForm's built-ins. */
const builtinRegistry = createBuiltinMlRegistry();

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
