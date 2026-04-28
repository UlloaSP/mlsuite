/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { createBuiltinRegistry } from "mlform/engine";

const builtinRegistry = createBuiltinRegistry();

export const getBuiltinRegistry = () => builtinRegistry;

export const BUILTIN_FIELD_DEFINITIONS = builtinRegistry.listFields();
export const BUILTIN_REPORT_DEFINITIONS = builtinRegistry.listReports();
export const BUILTIN_EXPLANATION_DEFINITIONS = builtinRegistry.listExplanations();

export const BUILTIN_FIELD_KINDS = BUILTIN_FIELD_DEFINITIONS.map((definition) => definition.kind);
export const BUILTIN_REPORT_KINDS = BUILTIN_REPORT_DEFINITIONS.map((definition) => definition.kind);
export const BUILTIN_EXPLANATION_KINDS = BUILTIN_EXPLANATION_DEFINITIONS.map(
	(definition) => definition.kind,
);

const builtinFieldKindSet = new Set(BUILTIN_FIELD_KINDS);
const builtinReportKindSet = new Set(BUILTIN_REPORT_KINDS);
const builtinExplanationKindSet = new Set(BUILTIN_EXPLANATION_KINDS);

export const isBuiltinFieldKind = (kind: string): boolean => builtinFieldKindSet.has(kind);

export const isBuiltinReportKind = (kind: string): boolean => builtinReportKindSet.has(kind);

export const isBuiltinExplanationKind = (kind: string): boolean =>
	builtinExplanationKindSet.has(kind);

export const builtinFieldKindsDisplay = (): string =>
	BUILTIN_FIELD_KINDS.map((kind) => `"${kind}"`).join(" | ");
