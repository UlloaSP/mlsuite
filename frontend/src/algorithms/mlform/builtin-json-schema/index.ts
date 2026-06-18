/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
  BUILTIN_FIELD_DEFINITIONS,
  BUILTIN_FIELD_KINDS,
  BUILTIN_REPORT_DEFINITIONS,
  BUILTIN_REPORT_KINDS,
} from "../builtin-registry";

type JsonSchema = Record<string, unknown>;

/** SUPPORTED_TOP_LEVEL_KEYS: internal constant/cache for MLForm compatibility and runtime adaptation. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const SUPPORTED_TOP_LEVEL_KEYS = ["fields", "reports"] as const;

/** sharedSchemaOverrides: internal override table for MLForm builtin schema JSON-schema conversion. @remarks Args: none; side cases: only known shared MLForm keys get handwritten schemas, unknown keys still use normal Zod conversion. @returns JSON-schema fragments used by the enclosing conversion algorithm. @throws Does not throw directly; malformed Zod conversion errors propagate from callers. */
const sharedSchemaOverrides: Record<string, JsonSchema> = {
  asyncValidationDebounceMs: { type: "integer", minimum: 0 },
  defaultValue: {},
  disabledWhen: { type: "object" },
  hiddenWhen: { type: "object" },
  inactiveFieldPolicy: { enum: ["include", "omit", "reset-on-hide"] },
  readOnlyWhen: { type: "object" },
  ui: { type: "object", additionalProperties: true },
  valuePath: {
    oneOf: [
      { type: "string", minLength: 1 },
      {
        type: "array",
        minItems: 1,
        items: { type: "string", minLength: 1 },
      },
    ],
  },
};

/** unwrapZodSchema: internal helper for MLForm compatibility and runtime adaptation. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const unwrapZodSchema = (schema: { def?: { type?: string; innerType?: unknown } }): unknown => {
  let current: unknown = schema;

  while (
    current &&
    typeof current === "object" &&
    "def" in current &&
    typeof (current as { def?: unknown }).def === "object" &&
    (current as { def: Record<string, unknown> }).def !== null
  ) {
    const def = (current as { def: Record<string, unknown> }).def;
    const type = def.type;
    if (type !== "optional" && type !== "default" && type !== "nullable") {
      break;
    }
    current = def.innerType;
  }

  return current;
};

/** toLiteralConst: internal normalization helper for MLForm compatibility and runtime adaptation. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const toLiteralConst = (schema: { def?: { values?: readonly unknown[] } }): JsonSchema =>
  schema.def?.values?.length === 1
    ? { const: schema.def.values[0] }
    : { enum: schema.def?.values ?? [] };

/** getRequiredKeys: internal lookup helper for MLForm compatibility and runtime adaptation. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const getRequiredKeys = (shape: Record<string, unknown>): string[] =>
  Object.entries(shape).reduce<string[]>((keys, [key, schema]) => {
    if (!schema || typeof schema !== "object" || !("def" in schema)) {
      return keys;
    }

    const def = (schema as { def: Record<string, unknown> }).def;
    if (
      typeof def === "object" &&
      def !== null &&
      def.type !== "optional" &&
      def.type !== "default"
    ) {
      keys.push(key);
    }
    return keys;
  }, []);

/** zodToJsonSchema: internal helper for MLForm compatibility and runtime adaptation. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const zodToJsonSchema = (input: unknown): JsonSchema => {
  if (!input || typeof input !== "object") {
    return {};
  }

  const schema = unwrapZodSchema(input as { def?: { type?: string; innerType?: unknown } });
  if (
    !schema ||
    typeof schema !== "object" ||
    !("def" in schema) ||
    typeof (schema as { def?: unknown }).def !== "object" ||
    (schema as { def: unknown }).def === null
  ) {
    return {};
  }

  const def = (schema as { def: Record<string, unknown> }).def;
  switch (def.type) {
    case "string":
      return { type: "string" };
    case "number":
      return { type: "number" };
    case "boolean":
      return { type: "boolean" };
    case "literal":
      return toLiteralConst(schema as { def?: { values?: readonly unknown[] } });
    case "array":
      return {
        type: "array",
        items: zodToJsonSchema((def as { element?: unknown }).element),
      };
    case "union":
      return {
        oneOf: ((def as { options?: unknown[] }).options ?? []).map(zodToJsonSchema),
      };
    case "object": {
      const shape = (schema as unknown as { shape: Record<string, unknown> }).shape;
      return {
        type: "object",
        additionalProperties: false,
        required: getRequiredKeys(shape),
        properties: Object.fromEntries(
          Object.entries(shape).map(([key, child]) => [
            key,
            sharedSchemaOverrides[key] ?? zodToJsonSchema(child),
          ]),
        ),
      };
    }
    default:
      return {};
  }
};

/** fieldSchema: internal helper for MLForm compatibility and runtime adaptation. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const fieldSchema = {
  oneOf: [
    ...BUILTIN_FIELD_DEFINITIONS.map((definition) => zodToJsonSchema(definition.schema)),
    {
      type: "object",
      required: ["kind", "label"],
      additionalProperties: true,
      properties: {
        kind: {
          type: "string",
          minLength: 1,
          not: { enum: BUILTIN_FIELD_KINDS },
        },
      },
    },
  ],
} as const;

/** reportSchema: internal helper for MLForm compatibility and runtime adaptation. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const reportSchema = {
  oneOf: [
    ...BUILTIN_REPORT_DEFINITIONS.map((definition) => zodToJsonSchema(definition.schema)),
    {
      type: "object",
      required: ["kind"],
      additionalProperties: true,
      properties: {
        kind: {
          type: "string",
          minLength: 1,
          not: { enum: BUILTIN_REPORT_KINDS },
        },
      },
    },
  ],
} as const;

/** fieldKeysByKind: internal helper for MLForm compatibility and runtime adaptation. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const fieldKeysByKind = Object.fromEntries(
  BUILTIN_FIELD_DEFINITIONS.map((definition) => [
    definition.kind,
    Object.keys((definition.schema as unknown as { shape: Record<string, unknown> }).shape),
  ]),
) as Record<string, readonly string[]>;

/** reportKeysByKind: internal helper for MLForm compatibility and runtime adaptation. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const reportKeysByKind = Object.fromEntries(
  BUILTIN_REPORT_DEFINITIONS.map((definition) => [
    definition.kind,
    Object.keys((definition.schema as unknown as { shape: Record<string, unknown> }).shape),
  ]),
) as Record<string, readonly string[]>;

/** allFieldKeys: internal helper for MLForm compatibility and runtime adaptation. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const allFieldKeys = [...new Set(Object.values(fieldKeysByKind).flat())];
/** allReportKeys: internal helper for MLForm compatibility and runtime adaptation. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const allReportKeys = [...new Set(Object.values(reportKeysByKind).flat())].filter(
  (key) => key !== "source",
);
/** MAPPED_TO_KEY: internal constant/cache for MLForm compatibility and runtime adaptation. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const MAPPED_TO_KEY = "mappedTo";

/**
 * getAllowedFieldKeys: extracts a derived value without mutating input
 *
 * Purpose: builds JSON-schema constraints for supported MLForm built-in field/report definitions.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const getAllowedFieldKeys = (kind: string | null): readonly string[] =>
  Array.from(
    new Set([
      ...(kind && fieldKeysByKind[kind] ? fieldKeysByKind[kind] : allFieldKeys),
      MAPPED_TO_KEY,
    ]),
  );

/**
 * getAllowedReportKeys: extracts a derived value without mutating input
 *
 * Purpose: builds JSON-schema constraints for supported MLForm built-in field/report definitions.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const getAllowedReportKeys = (kind: string | null): readonly string[] =>
  Array.from(
    new Set([
      ...(kind && reportKeysByKind[kind]
        ? reportKeysByKind[kind].filter((key) => key !== "source")
        : allReportKeys),
      MAPPED_TO_KEY,
    ]),
  );

/**
 * mlformJsonSchema: performs the exported transformation for this algorithm.
 *
 * Purpose: builds JSON-schema constraints for supported MLForm built-in field/report definitions.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const mlformJsonSchema = {
  type: "object",
  required: ["fields"],
  additionalProperties: false,
  properties: {
    fields: { type: "array", items: fieldSchema },
    reports: { type: "array", items: reportSchema },
  },
} as const;

export { SUPPORTED_TOP_LEVEL_KEYS };
