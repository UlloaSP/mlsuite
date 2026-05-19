/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { createMlRegistryPack } from "mlform/builtins-ml";
import type {
	FieldConfig,
	FieldDefinition,
	ReportConfig,
	ReportDefinition,
} from "mlform/runtime";

const builtinRegistry = createMlRegistryPack().registry;

export const getBuiltinRegistry = () => builtinRegistry;

export const BUILTIN_FIELD_DEFINITIONS = builtinRegistry.listFields() as FieldDefinition<FieldConfig, unknown>[];
export const BUILTIN_REPORT_DEFINITIONS = builtinRegistry.listReports() as ReportDefinition<ReportConfig>[];

export const BUILTIN_FIELD_KINDS = BUILTIN_FIELD_DEFINITIONS.map((definition) => definition.kind);
export const BUILTIN_REPORT_KINDS = BUILTIN_REPORT_DEFINITIONS.map((definition) => definition.kind);
const builtinFieldKindSet = new Set(BUILTIN_FIELD_KINDS);
const builtinReportKindSet = new Set(BUILTIN_REPORT_KINDS);

export const isBuiltinFieldKind = (kind: string): boolean => builtinFieldKindSet.has(kind);

export const isBuiltinReportKind = (kind: string): boolean => builtinReportKindSet.has(kind);

export const builtinFieldKindsDisplay = (): string =>
	BUILTIN_FIELD_KINDS.map((kind) => `"${kind}"`).join(" | ");
