/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { createMlRegistryPack } from "mlform/builtins";
import type { FieldConfig, FieldDefinition, ReportConfig, ReportDefinition } from "mlform/runtime";

/** builtinRegistry: internal helper for MLForm compatibility and runtime adaptation. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const builtinRegistry = createMlRegistryPack().registry;

/**
 * getBuiltinRegistry: extracts a derived value without mutating input
 *
 * Purpose: exposes the MLForm built-in registry and kind lookup helpers.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const getBuiltinRegistry = () => builtinRegistry;

/**
 * BUILTIN_FIELD_DEFINITIONS: exposes a stable constant used by this algorithm.
 *
 * Purpose: exposes the MLForm built-in registry and kind lookup helpers.
 * @returns Stable constant value shared by callers.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const BUILTIN_FIELD_DEFINITIONS = builtinRegistry.listFields() as FieldDefinition<
  FieldConfig,
  unknown
>[];
/**
 * BUILTIN_REPORT_DEFINITIONS: exposes a stable constant used by this algorithm.
 *
 * Purpose: exposes the MLForm built-in registry and kind lookup helpers.
 * @returns Stable constant value shared by callers.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const BUILTIN_REPORT_DEFINITIONS =
  builtinRegistry.listReports() as ReportDefinition<ReportConfig>[];

/**
 * BUILTIN_FIELD_KINDS: exposes a stable constant used by this algorithm.
 *
 * Purpose: exposes the MLForm built-in registry and kind lookup helpers.
 * @returns Stable constant value shared by callers.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const BUILTIN_FIELD_KINDS = BUILTIN_FIELD_DEFINITIONS.map((definition) => definition.kind);
/**
 * BUILTIN_REPORT_KINDS: exposes a stable constant used by this algorithm.
 *
 * Purpose: exposes the MLForm built-in registry and kind lookup helpers.
 * @returns Stable constant value shared by callers.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const BUILTIN_REPORT_KINDS = BUILTIN_REPORT_DEFINITIONS.map((definition) => definition.kind);
/** builtinFieldKindSet: internal constant/cache for MLForm compatibility and runtime adaptation. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const builtinFieldKindSet = new Set(BUILTIN_FIELD_KINDS);
/** builtinReportKindSet: internal constant/cache for MLForm compatibility and runtime adaptation. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const builtinReportKindSet = new Set(BUILTIN_REPORT_KINDS);

/**
 * isBuiltinFieldKind: returns a boolean guard/result for the requested predicate
 *
 * Purpose: exposes the MLForm built-in registry and kind lookup helpers.
 * @returns Boolean result for the domain predicate.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const isBuiltinFieldKind = (kind: string): boolean => builtinFieldKindSet.has(kind);

/**
 * isBuiltinReportKind: returns a boolean guard/result for the requested predicate
 *
 * Purpose: exposes the MLForm built-in registry and kind lookup helpers.
 * @returns Boolean result for the domain predicate.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const isBuiltinReportKind = (kind: string): boolean => builtinReportKindSet.has(kind);

/**
 * builtinFieldKindsDisplay: performs the exported transformation for this algorithm.
 *
 * Purpose: exposes the MLForm built-in registry and kind lookup helpers.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const builtinFieldKindsDisplay = (): string =>
  BUILTIN_FIELD_KINDS.map((kind) => `"${kind}"`).join(" | ");
