/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { z } from "zod";

/**
 * The messages between the app and the plugin sandbox, an iframe with an opaque origin that is
 * the only place plugin code runs. Each side validates every message it receives against these
 * schemas: the app treats whatever the sandbox sends as untrusted input, like form values.
 */
export const SANDBOX_CHANNEL = "mlsuite-plugin-sandbox";

const record = z.record(z.string(), z.unknown());

export const pluginCatalogEntrySchema = z.object({
  fileName: z.string(),
  source: z.string(),
  kind: z.string(),
});

/** An organization's plugins as data: sources and the kinds they define, never compiled code. */
export const pluginCatalogSchema = z.object({
  fields: z.array(pluginCatalogEntrySchema),
  reports: z.array(pluginCatalogEntrySchema),
});

export type PluginCatalogEntry = z.infer<typeof pluginCatalogEntrySchema>;
export type PluginCatalog = z.infer<typeof pluginCatalogSchema>;

const bindingSchema = z.object({
  modelId: z.number(),
  modelName: z.string().optional(),
  pluginPolicy: record.nullable().optional(),
});

export const sandboxThemeSchema = z.object({
  mode: z.enum(["light", "dark"]),
  tokens: z.record(z.string().regex(/^--[\w-]+$/), z.string()),
  /** The stylesheet the app's font families come from. */
  fonts: z.url({ protocol: /^https$/, hostname: /^fonts\.googleapis\.com$/ }).optional(),
});

export type SandboxTheme = z.infer<typeof sandboxThemeSchema>;

/** `fill` takes the frame's height and scrolls inside; `content` makes the frame as tall as it. */
export const sandboxSizingSchema = z.enum(["fill", "content"]);

export type SandboxSizing = z.infer<typeof sandboxSizingSchema>;

const reportViewSchema = z.object({
  kind: z.literal("report"),
  report: z.object({
    id: z.string(),
    order: z.number(),
    label: z.string(),
    kind: z.string(),
    config: record,
    payload: record.optional(),
    labels: z.array(z.string()).optional(),
  }),
  result: z.object({ modelId: z.number(), modelInput: record, output: record }),
  plugin: pluginCatalogEntrySchema,
  /** The API origin the app talks to, which a report's context names. */
  backendUrl: z.string(),
});

export const sandboxViewSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("run"),
    schema: z.unknown(),
    bindings: z.array(bindingSchema),
    plugins: pluginCatalogSchema,
    backendUrl: z.string(),
  }),
  z.object({ kind: z.literal("public-run"), schema: z.unknown(), plugins: pluginCatalogSchema }),
  z.object({ kind: z.literal("preview"), schema: z.unknown(), plugins: pluginCatalogSchema }),
  reportViewSchema,
]);

export type SandboxView = z.infer<typeof sandboxViewSchema>;
export type SandboxReportView = z.infer<typeof reportViewSchema>;

const pluginSourceSchema = z.object({ fileName: z.string(), source: z.string() });

export const pluginTypeSchema = z.enum(["field", "report"]);

export type PluginType = z.infer<typeof pluginTypeSchema>;

const schemaIssueSchema = z.object({
  path: z.array(z.union([z.string(), z.number()])),
  message: z.string(),
  severity: z.enum(["error", "warning"]),
});

const nothing = z.null();

/** What the app asks the sandbox: draw one view, or answer about plugin code without drawing. */
export const sandboxMethods = {
  mount: {
    params: z.object({
      view: sandboxViewSchema,
      theme: sandboxThemeSchema,
      sizing: sandboxSizingSchema,
    }),
    /** False when the view has nothing to draw (a report whose presenter returned nothing). */
    result: z.object({ rendered: z.boolean() }),
  },
  theme: { params: sandboxThemeSchema, result: nothing },
  sizing: { params: z.object({ sizing: sandboxSizingSchema }), result: nothing },
  "run-offered": { params: z.object({ offered: z.boolean() }), result: nothing },
  inspect: {
    params: z.object({ sources: z.array(pluginSourceSchema) }),
    /** One entry per source, in order. */
    result: z.array(z.object({ pluginType: pluginTypeSchema, kind: z.string() })),
  },
  "check-schema": {
    params: z.object({ schema: z.unknown(), plugins: pluginCatalogSchema }),
    result: z.object({ success: z.boolean(), issues: z.array(schemaIssueSchema) }),
  },
  "json-schema": { params: z.object({ plugins: pluginCatalogSchema }), result: record },
  "prepare-run": {
    params: z.object({
      schema: z.unknown(),
      bindings: z.array(bindingSchema),
      plugins: pluginCatalogSchema,
    }),
    result: z.object({ fields: z.array(record), reports: z.array(record) }),
  },
} as const;

const publicRunReportSchema = z.object({ key: z.string(), payload: record });

/** What the runtime returned for the report of the public form that carries this key. */
export type PublicRunReport = z.infer<typeof publicRunReportSchema>;

/** What the sandbox asks the app, which alone talks to the API. */
export const appMethods = {
  submit: {
    params: z.object({
      request: z.object({
        inputs: z.array(record),
        displayValues: record,
        modelValues: record,
        reports: z.array(record),
      }),
      fields: z.array(record),
    }),
    result: record,
  },
  "public-run": {
    params: z.object({ values: record }),
    result: z.discriminatedUnion("status", [
      z.object({ status: z.literal("answered"), reports: z.array(publicRunReportSchema) }),
      z.object({ status: z.literal("withheld") }),
      z.object({ status: z.literal("failed") }),
    ]),
  },
  /**
   * A report's request for an explanation of one of the run's predictions, the only API call a
   * plugin may make: the app makes it for a model the form runs, and answers with its response.
   */
  explain: {
    params: z.object({
      modelId: z.number().int(),
      body: z.object({ instance: record, traces: z.array(record).nullable().optional() }),
    }),
    result: z.object({ status: z.number().int(), body: z.unknown() }),
  },
} as const;

const runResultSchema = z.object({
  inputData: record,
  raw: record,
  reportsPending: z.boolean(),
});

/** What the sandbox tells the app without waiting for an answer. */
export const appEvents = {
  ready: z.object({}),
  resize: z.object({ height: z.number().finite().nonnegative() }),
  running: z.object({ running: z.boolean() }),
  "run-settled": runResultSchema,
  "run-updated": runResultSchema,
  "submit-error": z.object({ message: z.string() }),
} as const;

export const envelopeSchema = z.discriminatedUnion("type", [
  z.object({
    channel: z.literal(SANDBOX_CHANNEL),
    type: z.literal("request"),
    id: z.number().int(),
    method: z.string(),
    params: z.unknown(),
  }),
  z.object({
    channel: z.literal(SANDBOX_CHANNEL),
    type: z.literal("response"),
    id: z.number().int(),
    result: z.unknown(),
    error: z.string().optional(),
  }),
  z.object({
    channel: z.literal(SANDBOX_CHANNEL),
    type: z.literal("event"),
    name: z.string(),
    payload: z.unknown(),
  }),
]);

export type Envelope = z.infer<typeof envelopeSchema>;

export type MethodMap = Record<string, { params: z.ZodType; result: z.ZodType }>;
export type EventMap = Record<string, z.ZodType>;

export type ParamsOf<M extends MethodMap, K extends keyof M> = z.infer<M[K]["params"]>;
export type ResultOf<M extends MethodMap, K extends keyof M> = z.infer<M[K]["result"]>;

export type SandboxMethods = typeof sandboxMethods;
export type AppMethods = typeof appMethods;
export type AppEvents = typeof appEvents;

export type AppEvent = {
  [K in keyof AppEvents]: { name: K; payload: z.infer<AppEvents[K]> };
}[keyof AppEvents];

/** Data the sandbox computed (plugin payloads included), reduced to what JSON can carry. */
export const toJsonData = <T>(value: T): T => JSON.parse(JSON.stringify(value ?? null)) as T;
