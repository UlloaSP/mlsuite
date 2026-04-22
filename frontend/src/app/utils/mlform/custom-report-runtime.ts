/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportConfig, ReportDefinition } from "mlform/engine";

type TypeScriptModule = typeof import("typescript");
type ZodModule = typeof import("zod");

declare global {
	interface Window {
		__MLSUITE_CUSTOM_REPORT_ZOD__?: ZodModule;
	}
}

export const CUSTOM_REPORT_COMPONENT = "mlsuite-custom-report";

const definitionCache = new Map<string, Promise<ReportDefinition<ReportConfig>>>();
let typescriptPromise: Promise<TypeScriptModule> | null = null;
let zodPromise: Promise<ZodModule> | null = null;
const zodGlobalPrefix = "__MLSUITE_CUSTOM_REPORT_ZOD__";

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
	`${zodGlobalPrefix}_${hashString(source)}`;

const loadTypeScript = async (): Promise<TypeScriptModule> => {
	typescriptPromise ??= import("typescript");
	return typescriptPromise;
};

const loadZod = async (): Promise<ZodModule> => {
	zodPromise ??= import("zod");
	return zodPromise;
};

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

const prependRuntimeShims = (source: string, zodGlobalKey: string): string => `const defineReportDefinition = (value) => value;
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
		throw new Error(formatDiagnostics(ts, result.diagnostics ?? []));
	}
	return result.outputText;
};

function assertReportDefinition(value: unknown): asserts value is ReportDefinition<ReportConfig> {
	if (!isRecord(value)) {
		throw new Error("Custom report module must export a default report definition.");
	}
	if (typeof value.kind !== "string" || value.kind.trim().length === 0) {
		throw new Error('Custom report definition must define non-empty string "kind".');
	}
	if (!isRecord(value.schema) || typeof value.schema.safeParse !== "function") {
		throw new Error('Custom report definition must expose Zod schema as "schema".');
	}
	if (typeof value.describe !== "function") {
		throw new Error('Custom report definition must expose "describe(config, ctx)".');
	}
}

const importDefinitionFromSource = async (source: string): Promise<ReportDefinition<ReportConfig>> => {
	const [outputText, zod] = await Promise.all([transpileSource(source), loadZod()]);
	const blob = new Blob([outputText], { type: "text/javascript" });
	const url = URL.createObjectURL(blob);
	const zodGlobalKey = getZodGlobalKey(source);
	try {
		(globalThis as Record<string, unknown>)[zodGlobalKey] = zod;
		const moduleValue = await import(/* @vite-ignore */ url);
		if (!isRecord(moduleValue) || !("default" in moduleValue)) {
			throw new Error("Custom report module must export exactly one default report definition.");
		}
		const definition: unknown = moduleValue.default;
		assertReportDefinition(definition);
		return definition;
	} finally {
		delete (globalThis as Record<string, unknown>)[zodGlobalKey];
		URL.revokeObjectURL(url);
	}
};

export const resolveCustomReportDefinition = async (
	source: string,
): Promise<ReportDefinition<ReportConfig>> => {
	const cacheKey = hashString(source);
	let cachedModule = definitionCache.get(cacheKey);
	if (!cachedModule) {
		cachedModule = importDefinitionFromSource(source);
		definitionCache.set(cacheKey, cachedModule);
	}
	return cachedModule;
};

export const customReportTemplate = `export default defineReportDefinition({
  kind: "custom-summary-report",
  schema: z
    .object({
      kind: z.literal("custom-summary-report"),
      id: z.string().optional(),
      label: z.string().optional(),
      description: z.string().optional(),
    })
    .passthrough(),
  resolvePayload: (_config, context) => context.result.raw,
  describe: (config, context) => ({
    component: "${CUSTOM_REPORT_COMPONENT}",
    props: {
      label: config.label ?? "Custom Summary",
      description: config.description,
      result: {
        title: config.label ?? "Custom Summary",
        blocks: [
          "Custom report plugin active.",
          JSON.stringify(context.payload ?? {}, null, 2),
        ],
      },
    },
  }),
});
`;

export const validateCustomReportSource = async (
	source: string,
): Promise<ReportDefinition<ReportConfig>> => {
	const definition = await resolveCustomReportDefinition(source);
	const probe = definition.schema.safeParse({ kind: definition.kind, label: "Preview report" });
	if (probe.success) {
		const descriptor = definition.describe(probe.data, {
			reportId: "preview-report",
			state: {
				payload: undefined,
				error: null,
				status: "ready",
			},
			payload: {},
			result: {
				reportStates: {},
				reports: {},
				meta: {},
				raw: {},
			},
		});
		if (descriptor !== null && descriptor.component !== CUSTOM_REPORT_COMPONENT) {
			throw new Error(
				`Custom report kind "${definition.kind}" must use shared renderer "${CUSTOM_REPORT_COMPONENT}".`,
			);
		}
	}
	return definition;
};
