/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type {
  ExplanationConfig,
  ExplanationDefinition,
  ExplanationFetchRequest,
  NormalizedExplanationConfig,
} from "mlform/engine";
import type { QuestionnaireSchema } from "mlform/questionnaire";

type TypeScriptModule = typeof import("typescript");
type ZodModule = typeof import("zod");
type PresentationContentLike = unknown;

type DeclarativeExplanationModule<TConfig extends ExplanationConfig = ExplanationConfig> = {
  kind: string;
  schema: ExplanationDefinition<TConfig>["schema"];
  feedbackQuestionnaire?: QuestionnaireSchema;
  fetch: (context: { config: NormalizedExplanationConfig<TConfig>; explanationId: string }) => {
    submit: (request: ExplanationFetchRequest) => Promise<unknown>;
  };
  render: {
    summary?: (context: {
      config: NormalizedExplanationConfig<TConfig>;
      explanationId: string;
      state: Parameters<ExplanationDefinition<TConfig>["describe"]>[1]["state"];
      result: unknown;
    }) => Record<string, unknown> | null | undefined;
    content: (context: {
      config: NormalizedExplanationConfig<TConfig>;
      explanationId: string;
      state: Parameters<ExplanationDefinition<TConfig>["describe"]>[1]["state"];
      result: unknown;
    }) => PresentationContentLike;
  };
};

export type ExplanationDefinitionWithFeedback = ExplanationDefinition<ExplanationConfig> & {
  feedbackQuestionnaire?: QuestionnaireSchema;
};

let typescriptPromise: Promise<TypeScriptModule> | null = null;
let zodPromise: Promise<ZodModule> | null = null;
const definitionCache = new Map<string, Promise<ExplanationDefinitionWithFeedback>>();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hashString = (value: string): string => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
};

const getZodGlobalKey = (source: string): string =>
  `__MLSUITE_CUSTOM_EXPLANATION_FB_ZOD__${hashString(source)}`;

const loadTypeScript = async (): Promise<TypeScriptModule> => {
  typescriptPromise ??= import("typescript");
  return typescriptPromise;
};

const loadZod = async (): Promise<ZodModule> => {
  zodPromise ??= import("zod");
  return zodPromise;
};

const toPresentationNodes = (value: PresentationContentLike): unknown[] =>
  value === undefined ? [] : Array.isArray(value) ? [...value] : [value];

const toBackendPatchedRequest = (request: ExplanationFetchRequest): ExplanationFetchRequest => {
  const backendFieldValues = isRecord(request.meta.backendFieldValues)
    ? request.meta.backendFieldValues
    : null;

  if (!backendFieldValues) {
    return request;
  }

  return {
    ...request,
    values: backendFieldValues,
    fieldValues: backendFieldValues,
    serializedValues: backendFieldValues,
    serializedFieldValues: backendFieldValues,
  };
};

const normalizeExplanationConfig = <TConfig extends ExplanationConfig>(
  config: NormalizedExplanationConfig<TConfig>,
): NormalizedExplanationConfig<TConfig> => {
  const endpoint = (config as Record<string, unknown>).endpoint;
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  if (
    typeof endpoint !== "string" ||
    endpoint.trim().length === 0 ||
    typeof backendUrl !== "string" ||
    backendUrl.trim().length === 0 ||
    !/^(?:\/|\.\/|\.\.\/)/.test(endpoint)
  ) {
    return config;
  }

  return {
    ...config,
    endpoint: new URL(endpoint, backendUrl).toString(),
  };
};

const prependRuntimeShims = (
  source: string,
  zodGlobalKey: string,
): string => `const defineExplanationKind = (value) => value;
const createQuestionnaireSchema = (value) => value;
const z = globalThis[${JSON.stringify(zodGlobalKey)}];
${source}`;

const transpileSource = async (source: string): Promise<string> => {
  const ts = await loadTypeScript();
  const result = ts.transpileModule(prependRuntimeShims(source, getZodGlobalKey(source)), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      strict: true,
      isolatedModules: true,
      useDefineForClassFields: true,
    },
    reportDiagnostics: true,
  });

  if ((result.diagnostics?.length ?? 0) > 0) {
    throw new Error("Custom explanation plugin could not be transpiled.");
  }

  return result.outputText;
};

const assertQuestionnaireSchema = (value: unknown): QuestionnaireSchema | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (!isRecord(value) || !Array.isArray(value.steps) || value.steps.length === 0) {
    throw new Error('Custom explanation "feedbackQuestionnaire" must define non-empty "steps".');
  }
  return value as unknown as QuestionnaireSchema;
};

const assertDeclarativeExplanationModule: (
  value: unknown,
) => asserts value is DeclarativeExplanationModule = (value) => {
  if (!isRecord(value))
    throw new Error("Custom explanation module must export a default explanation kind.");
  if (typeof value.kind !== "string" || value.kind.trim().length === 0) {
    throw new Error('Custom explanation kind must define non-empty string "kind".');
  }
  if (!isRecord(value.schema) || typeof value.schema.safeParse !== "function") {
    throw new Error('Custom explanation kind must expose Zod schema as "schema".');
  }
  if (typeof value.fetch !== "function") {
    throw new Error('Custom explanation kind must expose "fetch({ config, explanationId })".');
  }
  if (!isRecord(value.render) || typeof value.render.content !== "function") {
    throw new Error('Custom explanation kind must expose "render.content(ctx)".');
  }
  assertQuestionnaireSchema(value.feedbackQuestionnaire);
};

const adaptDeclarativeExplanationModule = (
  moduleValue: DeclarativeExplanationModule,
): ExplanationDefinitionWithFeedback => ({
  kind: moduleValue.kind,
  schema: moduleValue.schema,
  feedbackQuestionnaire: moduleValue.feedbackQuestionnaire,
  transport: (config) => {
    const normalizedConfig = normalizeExplanationConfig(
      config as NormalizedExplanationConfig<ExplanationConfig>,
    );
    const transport = moduleValue.fetch({
      config: normalizedConfig,
      explanationId: normalizedConfig.id,
    });
    return {
      submit: (request) => transport.submit(toBackendPatchedRequest(request)),
    };
  },
  describe: (config, context) => {
    const normalizedConfig = normalizeExplanationConfig(
      config as NormalizedExplanationConfig<ExplanationConfig>,
    );
    const renderContext = {
      config: normalizedConfig,
      explanationId: normalizedConfig.id,
      state: context.state,
      result: context.state.result,
    };
    return {
      component: "declarative-explanation",
      props: {
        id: normalizedConfig.id,
        kind: normalizedConfig.kind,
        label: normalizedConfig.label ?? normalizedConfig.id,
        description: normalizedConfig.description ?? "",
        chromeless:
          (isRecord(normalizedConfig) && normalizedConfig.chromeless === true) ||
          normalizedConfig.kind === "mimosa",
        result: context.state.result,
        error: context.state.error,
        state: context.state.status,
        summary: moduleValue.render.summary?.(renderContext) ?? null,
        content:
          context.state.result === undefined && context.state.error === null
            ? []
            : toPresentationNodes(moduleValue.render.content(renderContext)),
      },
      meta: { declarative: true },
    };
  },
});

const importDefinition = async (source: string): Promise<ExplanationDefinitionWithFeedback> => {
  const [outputText, zod] = await Promise.all([transpileSource(source), loadZod()]);
  const blob = new Blob([outputText], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const zodGlobalKey = getZodGlobalKey(source);

  try {
    (globalThis as Record<string, unknown>)[zodGlobalKey] = zod;
    const moduleValue = await import(/* @vite-ignore */ url);
    if (!isRecord(moduleValue) || !("default" in moduleValue)) {
      throw new Error(
        "Custom explanation module must export exactly one default explanation kind.",
      );
    }

    const declarativeValue: unknown = moduleValue.default;
    assertDeclarativeExplanationModule(declarativeValue);
    return adaptDeclarativeExplanationModule(declarativeValue);
  } finally {
    delete (globalThis as Record<string, unknown>)[zodGlobalKey];
    URL.revokeObjectURL(url);
  }
};

export const resolveCustomExplanationDefinitionWithFeedback = async (
  source: string,
): Promise<ExplanationDefinitionWithFeedback> => {
  const cacheKey = hashString(source);
  let cached = definitionCache.get(cacheKey);
  if (!cached) {
    cached = importDefinition(source);
    definitionCache.set(cacheKey, cached);
  }
  return cached;
};

export const validateCustomExplanationSourceWithFeedback = async (
  source: string,
): Promise<ExplanationDefinitionWithFeedback> =>
  resolveCustomExplanationDefinitionWithFeedback(source);
