/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type {
	ExplanationConfig,
	ExplanationDefinition,
	ExplanationFetchTransport,
	ExplanationStateSnapshot,
	NormalizedExplanationConfig,
} from "mlform/engine";

type TypeScriptModule = typeof import("typescript");
type ZodModule = typeof import("zod");

declare global {
	interface Window {
		__MLSUITE_CUSTOM_EXPLANATION_ZOD__?: ZodModule;
	}
}

type PresentationSummaryLike = Record<string, unknown> | null | undefined;
type PresentationContentLike = unknown | readonly unknown[];
type DeclarativeExplanationFetchContext<TConfig extends ExplanationConfig = ExplanationConfig> = {
	config: NormalizedExplanationConfig<TConfig>;
	explanationId: string;
};
type DeclarativeExplanationRenderContext<
	TConfig extends ExplanationConfig = ExplanationConfig,
	TResult = unknown,
> = {
	config: NormalizedExplanationConfig<TConfig>;
	explanationId: string;
	state: ExplanationStateSnapshot;
	result: TResult;
};
type DeclarativeCatalogExplanationKind<
	TConfig extends ExplanationConfig = ExplanationConfig,
	TResult = unknown,
> = {
	kind: string;
	schema: ExplanationDefinition<TConfig>["schema"];
	fetch: (context: DeclarativeExplanationFetchContext<TConfig>) => ExplanationFetchTransport;
	render: {
		summary?: (context: DeclarativeExplanationRenderContext<TConfig, TResult>) => PresentationSummaryLike;
		content: (context: DeclarativeExplanationRenderContext<TConfig, TResult>) => PresentationContentLike;
	};
};

const definitionCache = new Map<string, Promise<ExplanationDefinition<ExplanationConfig>>>();
let typescriptPromise: Promise<TypeScriptModule> | null = null;
let zodPromise: Promise<ZodModule> | null = null;
const declarativeExplanationComponent = "declarative-explanation";

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const hashString = (value: string): string => {
	let hash = 0;
	for (let index = 0; index < value.length; index += 1) {
		hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
	}
	return hash.toString(36);
};

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

const adaptDeclarativeExplanationKind = (
	kind: DeclarativeCatalogExplanationKind,
): ExplanationDefinition<ExplanationConfig> => ({
	kind: kind.kind,
	schema: kind.schema,
	transport: (config) =>
		kind.fetch({
			config: config as NormalizedExplanationConfig<ExplanationConfig>,
			explanationId: (config as NormalizedExplanationConfig<ExplanationConfig>).id,
		}),
	describe: (config, context) => {
		const normalizedConfig = config as NormalizedExplanationConfig<ExplanationConfig>;
		const renderContext: DeclarativeExplanationRenderContext<ExplanationConfig, unknown> = {
			config: normalizedConfig,
			explanationId: normalizedConfig.id,
			state: context.state,
			result: context.state.result,
		};
		return {
			component: declarativeExplanationComponent,
			props: {
				id: normalizedConfig.id,
				kind: normalizedConfig.kind,
				label: normalizedConfig.label ?? normalizedConfig.id,
				description: normalizedConfig.description ?? "",
				result: context.state.result,
				error: context.state.error,
				state: context.state.status,
				summary: kind.render.summary?.(renderContext) ?? null,
				content:
					context.state.result === undefined && context.state.error === null
						? []
						: toPresentationNodes(kind.render.content(renderContext)),
			},
			meta: { declarative: true },
		};
	},
});

const formatDiagnostics = (
	ts: TypeScriptModule,
	diagnostics: readonly import("typescript").Diagnostic[],
): string =>
	diagnostics.length === 0
		? "Unknown TypeScript error."
		: diagnostics
				.map((diagnostic) => {
					const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
					if (!diagnostic.file || diagnostic.start === undefined) {
						return message;
					}
					const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
					return `L${position.line + 1}:C${position.character + 1} ${message}`;
				})
				.join("\n");

const prependRuntimeShims = (source: string): string => `const defineExplanationKind = (value) => value;
const z = window.__MLSUITE_CUSTOM_EXPLANATION_ZOD__;
${source}`;

const transpileSource = async (source: string): Promise<string> => {
	const ts = await loadTypeScript();
	const result = ts.transpileModule(prependRuntimeShims(source), {
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
		throw new Error(formatDiagnostics(ts, result.diagnostics ?? []));
	}
	return result.outputText;
};

function assertDeclarativeExplanationKind(
	value: unknown,
): asserts value is DeclarativeCatalogExplanationKind {
	if (!isRecord(value)) {
		throw new Error("Custom explanation module must export a default explanation kind.");
	}
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
	if ("summary" in value.render && value.render.summary !== undefined && typeof value.render.summary !== "function") {
		throw new Error('Custom explanation kind "render.summary" must be a function when provided.');
	}
}

const importDefinitionFromSource = async (
	source: string,
): Promise<ExplanationDefinition<ExplanationConfig>> => {
	const [outputText, zod] = await Promise.all([transpileSource(source), loadZod()]);
	const blob = new Blob([outputText], { type: "text/javascript" });
	const url = URL.createObjectURL(blob);
	const previousZod = window.__MLSUITE_CUSTOM_EXPLANATION_ZOD__;
	try {
		window.__MLSUITE_CUSTOM_EXPLANATION_ZOD__ = zod;
		const moduleValue = await import(/* @vite-ignore */ url);
		if (!isRecord(moduleValue) || !("default" in moduleValue)) {
			throw new Error("Custom explanation module must export exactly one default explanation kind.");
		}
		const declarativeKind: unknown = moduleValue.default;
		assertDeclarativeExplanationKind(declarativeKind);
		return adaptDeclarativeExplanationKind(declarativeKind);
	} finally {
		window.__MLSUITE_CUSTOM_EXPLANATION_ZOD__ = previousZod;
		URL.revokeObjectURL(url);
	}
};

export const resolveCustomExplanationDefinition = async (
	source: string,
): Promise<ExplanationDefinition<ExplanationConfig>> => {
	const cacheKey = hashString(source);
	let cachedModule = definitionCache.get(cacheKey);
	if (!cachedModule) {
		cachedModule = importDefinitionFromSource(source);
		definitionCache.set(cacheKey, cachedModule);
	}
	return cachedModule;
};

export const customExplanationTemplate = `export default defineExplanationKind({
  kind: "custom-explanation",
  schema: z
    .object({
      kind: z.literal("custom-explanation"),
      id: z.string().optional(),
      label: z.string().optional(),
      description: z.string().optional(),
      endpoint: z.string().min(1).default("/api/analyzer/explain/by-id"),
    })
    .passthrough(),
  fetch: ({ config }) => ({
    submit: async (request) => {
      const response = await fetch(config.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: request.signal,
        credentials: "include",
        body: JSON.stringify({
          values: request.serializedValues,
          fieldValues: request.serializedFieldValues,
          reports: request.reports,
          meta: request.meta,
        }),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
  }),
  render: {
    summary: ({ config, state }) => ({
      title: config.label ?? "Custom explanation",
      description: config.description,
      tone: state.status === "error" ? "danger" : "neutral",
    }),
    content: ({ result, state }) => {
      if (state.error) {
        return { type: "notice", title: "Explanation failed", body: state.error, tone: "danger" };
      }
      if (typeof result === "string") {
        return { type: "text", value: result };
      }
      if (Array.isArray(result)) {
        return { type: "list", items: result };
      }
      return { type: "json", value: result ?? { empty: true } };
    },
  },
});
`;

export const validateCustomExplanationSource = async (
	source: string,
): Promise<ExplanationDefinition<ExplanationConfig>> => resolveCustomExplanationDefinition(source);
