/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { PrimitiveReportRequest } from "mlform/primitives";
import {
	getActiveCustomExplanations,
	type CustomExplanationDto,
} from "../../api/customExplanationService";

type TypeScriptModule = typeof import("typescript");

export type ActiveCustomExplanationDefinition = {
	id: string;
	fileName: string;
	source: string;
	updatedAt: string;
};

export type CustomExplanationFetchJson = <T = unknown>(
	path: string,
	init?: RequestInit,
) => Promise<T>;

export type CustomExplanationContext = {
	request: PrimitiveReportRequest;
	props: Record<string, unknown>;
	modelId: string;
	instance: Record<string, unknown>;
	signal: AbortSignal;
	fetchExplanation: () => Promise<string[]>;
	fetchJson: CustomExplanationFetchJson;
};

export type CustomExplanationResult =
	| string
	| string[]
	| {
		title?: string;
		html?: string;
		blocks?: string[];
		emptyText?: string;
	};

export type CustomExplanationRunner = (
	context: CustomExplanationContext,
) => Promise<CustomExplanationResult> | CustomExplanationResult;

export type NormalizedCustomExplanationResult = {
	title: string | null;
	html: string | null;
	blocks: string[];
	emptyText: string | null;
};

const moduleCache = new Map<string, Promise<CustomExplanationRunner>>();
let typescriptPromise: Promise<TypeScriptModule> | null = null;

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

const resolveRunnerExport = (moduleValue: unknown): CustomExplanationRunner => {
	if (isRecord(moduleValue) && typeof moduleValue.default === "function") {
		return moduleValue.default as CustomExplanationRunner;
	}

	if (isRecord(moduleValue) && typeof moduleValue.renderExplanation === "function") {
		return moduleValue.renderExplanation as CustomExplanationRunner;
	}

	throw new Error(
		'Custom explanation module must export `default` or `renderExplanation` as a function.',
	);
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

const transpileSource = async (source: string): Promise<string> => {
	const ts = await loadTypeScript();
	const result = ts.transpileModule(source, {
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

const importRunnerFromSource = async (source: string): Promise<CustomExplanationRunner> => {
	const outputText = await transpileSource(source);
	const blob = new Blob([outputText], { type: "text/javascript" });
	const url = URL.createObjectURL(blob);

	try {
		const moduleValue = await import(/* @vite-ignore */ url);
		return resolveRunnerExport(moduleValue);
	} finally {
		URL.revokeObjectURL(url);
	}
};

export const customExplanationTemplate = `export default async function renderExplanation(ctx) {
  const response = await ctx.fetchJson(
    \`/api/analyzer/explain/by-id?modelId=\${encodeURIComponent(ctx.modelId)}\`,
    {
      method: "POST",
      signal: ctx.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instance: ctx.instance,
        traces: [],
      }),
    },
  );

  const explanations = Array.isArray(response?.explanations)
    ? response.explanations.filter(
        (line) => typeof line === "string" && line.trim().length > 0,
      )
    : [];

  return {
    title: "Custom explanation",
    blocks: explanations.map((line, index) => \`[\${index + 1}] \${line}\`),
    emptyText: "No explanation returned by backend.",
  };
}
`;
let activeDefinitionsPromise: Promise<ActiveCustomExplanationDefinition[]> | null = null;

export const validateCustomExplanationSource = async (
	source: string,
): Promise<CustomExplanationRunner> => {
	const runner = await importRunnerFromSource(source);
	return runner;
};

const normalizeActiveDefinition = (
	definition: CustomExplanationDto,
): ActiveCustomExplanationDefinition => ({
	id: definition.id,
	fileName: definition.fileName,
	source: definition.source,
	updatedAt: definition.updatedAt,
});

export const invalidateActiveCustomExplanationDefinition = (): void => {
	activeDefinitionsPromise = null;
};

export const getActiveCustomExplanationDefinitions = async (): Promise<
	ActiveCustomExplanationDefinition[]
> => {
	activeDefinitionsPromise ??= getActiveCustomExplanations().then((definitions) =>
		definitions.map(normalizeActiveDefinition),
	);
	return activeDefinitionsPromise;
};

export const resolveCustomExplanationRunner = async (
	definition: ActiveCustomExplanationDefinition,
): Promise<CustomExplanationRunner> => {
	const cacheKey = hashString(definition.source);
	let cachedModule = moduleCache.get(cacheKey);

	if (!cachedModule) {
		cachedModule = importRunnerFromSource(definition.source);
		moduleCache.set(cacheKey, cachedModule);
	}

	return cachedModule;
};

export const normalizeCustomExplanationResult = (
	value: CustomExplanationResult,
): NormalizedCustomExplanationResult => {
	if (typeof value === "string" || Array.isArray(value)) {
		return {
			title: null,
			html: null,
			blocks: normalizeTextBlocks(value),
			emptyText: null,
		};
	}

	if (!isRecord(value)) {
		return {
			title: null,
			html: null,
			blocks: [],
			emptyText: null,
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
	};
};
