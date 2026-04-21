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
import { getCustomExplanations, type CustomExplanationDto } from "../../api/customExplanationService";

type TypeScriptModule = typeof import("typescript");
type ZodModule = typeof import("zod");

declare global {
	interface Window {
		__MLSUITE_CUSTOM_EXPLANATION_ZOD__?: ZodModule;
	}
}

export type CustomExplanationResult =
	| string
	| string[]
	| {
		title?: string;
		html?: string;
		blocks?: string[];
		emptyText?: string;
	};

export type NormalizedCustomExplanationResult = {
	title: string | null;
	html: string | null;
	blocks: string[];
	emptyText: string | null;
	jsonFallback: string | null;
};

export type CatalogExplanationDefinition = Pick<
	CustomExplanationDto,
	"id" | "fileName" | "source" | "updatedAt" | "createdAt" | "contentType" | "sizeBytes" | "active"
> & {
	kind: string;
	definition: ExplanationDefinition<ExplanationConfig>;
};

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
	fetch: (
		context: DeclarativeExplanationFetchContext<TConfig>,
	) => ExplanationFetchTransport;
	render: {
		summary?: (
			context: DeclarativeExplanationRenderContext<TConfig, TResult>,
		) => PresentationSummaryLike;
		content: (
			context: DeclarativeExplanationRenderContext<TConfig, TResult>,
		) => PresentationContentLike;
	};
};

const definitionCache = new Map<string, Promise<ExplanationDefinition<ExplanationConfig>>>();
let typescriptPromise: Promise<TypeScriptModule> | null = null;
let zodPromise: Promise<ZodModule> | null = null;
let catalogDefinitionsPromise: Promise<CatalogExplanationDefinition[]> | null = null;
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

const toPresentationNodes = (value: PresentationContentLike): unknown[] => {
	if (value === undefined) {
		return [];
	}

	return Array.isArray(value) ? [...value] : [value];
};

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
			meta: {
				declarative: true,
			},
		};
	},
});

const formatDiagnostics = (
	ts: TypeScriptModule,
	diagnostics: readonly import("typescript").Diagnostic[],
): string => {
	if (diagnostics.length === 0) {
		return "Unknown TypeScript error.";
	}

	return diagnostics
		.map((diagnostic) => {
			const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
			if (!diagnostic.file || diagnostic.start === undefined) {
				return message;
			}

			const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
			return `L${position.line + 1}:C${position.character + 1} ${message}`;
		})
		.join("\n");
};

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

	if (!isRecord(value.render)) {
		throw new Error('Custom explanation kind must expose "render".');
	}

	if (typeof value.render.content !== "function") {
		throw new Error('Custom explanation kind must expose "render.content(ctx)".');
	}

	if ("summary" in value.render && value.render.summary !== undefined) {
		if (typeof value.render.summary !== "function") {
			throw new Error('Custom explanation kind "render.summary" must be a function when provided.');
		}
	}
}

const resolveDefinitionExport = (
	moduleValue: unknown,
): ExplanationDefinition<ExplanationConfig> => {
	if (!isRecord(moduleValue) || !("default" in moduleValue)) {
		throw new Error("Custom explanation module must export exactly one default explanation kind.");
	}

	const declarativeKind: unknown = moduleValue.default;
	assertDeclarativeExplanationKind(declarativeKind);
	return adaptDeclarativeExplanationKind(declarativeKind);
};

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
		return resolveDefinitionExport(moduleValue);
	} finally {
		window.__MLSUITE_CUSTOM_EXPLANATION_ZOD__ = previousZod;
		URL.revokeObjectURL(url);
	}
};

const resolveCustomExplanationDefinition = async (
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

const assertUniqueKinds = (definitions: readonly CatalogExplanationDefinition[]): void => {
	const seenKinds = new Map<string, string>();

	for (const definition of definitions) {
		const previous = seenKinds.get(definition.kind);
		if (previous) {
			throw new Error(
				`Duplicate custom explanation kind "${definition.kind}" in catalog (${previous}, ${definition.fileName}).`,
			);
		}

		seenKinds.set(definition.kind, definition.fileName);
	}
};

const toCatalogDefinition = async (
	item: CustomExplanationDto,
): Promise<CatalogExplanationDefinition> => {
	const definition = await resolveCustomExplanationDefinition(item.source);
	return {
		id: item.id,
		fileName: item.fileName,
		source: item.source,
		updatedAt: item.updatedAt,
		createdAt: item.createdAt,
		contentType: item.contentType,
		sizeBytes: item.sizeBytes,
		active: item.active,
		kind: definition.kind,
		definition,
	};
};

const normalizeTextBlocks = (value: unknown): string[] => {
	if (Array.isArray(value)) {
		return value.filter(
			(item): item is string => typeof item === "string" && item.trim().length > 0,
		);
	}

	if (typeof value === "string" && value.trim().length > 0) {
		return [value];
	}

	return [];
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
        return {
          type: "notice",
          title: "Explanation failed",
          body: state.error,
          tone: "danger",
        };
      }

      if (typeof result === "string") {
        return {
          type: "text",
          value: result,
        };
      }

      if (Array.isArray(result)) {
        return {
          type: "list",
          items: result,
        };
      }

      return {
        type: "json",
        value: result ?? { empty: true },
      };
    },
  },
});
`;

export const validateCustomExplanationSource = async (
	source: string,
): Promise<ExplanationDefinition<ExplanationConfig>> => {
	return resolveCustomExplanationDefinition(source);
};

export const invalidateActiveCustomExplanationDefinition = (): void => {
	catalogDefinitionsPromise = null;
};

export const getCatalogExplanationDefinitions = async (): Promise<
	readonly CatalogExplanationDefinition[]
> => {
	catalogDefinitionsPromise ??= getCustomExplanations().then(async (items) => {
		const settled = await Promise.all(
			items.map(async (item) => {
				try {
					return await toCatalogDefinition(item);
				} catch (error: unknown) {
					console.warn(
						`Skipping custom explanation plugin "${item.fileName}" (${item.id}): ${
							error instanceof Error ? error.message : String(error)
						}`,
					);
					return null;
				}
			}),
		);
		const definitions = settled.filter(
			(definition): definition is CatalogExplanationDefinition => definition !== null,
		);
		assertUniqueKinds(definitions);
		return definitions;
	});

	return catalogDefinitionsPromise;
};

export const normalizeCustomExplanationResult = (
	value: unknown,
): NormalizedCustomExplanationResult => {
	if (typeof value === "string" || Array.isArray(value)) {
		return {
			title: null,
			html: null,
			blocks: normalizeTextBlocks(value),
			emptyText: null,
			jsonFallback: null,
		};
	}

	if (!isRecord(value)) {
		return {
			title: null,
			html: null,
			blocks: [],
			emptyText: null,
			jsonFallback:
				value === undefined
					? null
					: JSON.stringify(value, null, 2),
		};
	}

	const hasStructuredResult =
		typeof value.title === "string" ||
		typeof value.html === "string" ||
		Array.isArray(value.blocks) ||
		typeof value.emptyText === "string";

	if (!hasStructuredResult) {
		return {
			title: null,
			html: null,
			blocks: [],
			emptyText: null,
			jsonFallback: JSON.stringify(value, null, 2),
		};
	}

	return {
		title: typeof value.title === "string" && value.title.trim().length > 0 ? value.title : null,
		html: typeof value.html === "string" && value.html.trim().length > 0 ? value.html : null,
		blocks: normalizeTextBlocks(value.blocks),
		emptyText:
			typeof value.emptyText === "string" && value.emptyText.trim().length > 0
				? value.emptyText
				: null,
		jsonFallback: null,
	};
};
