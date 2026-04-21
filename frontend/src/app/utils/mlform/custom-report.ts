/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportConfig, ReportDefinition } from "mlform/engine";
import { getCustomReports, type CustomReportDto } from "../../api/customReportService";

type TypeScriptModule = typeof import("typescript");
type ZodModule = typeof import("zod");

declare global {
	interface Window {
		__MLSUITE_CUSTOM_REPORT_ZOD__?: ZodModule;
	}
}

export const CUSTOM_REPORT_COMPONENT = "mlsuite-custom-report";

export type CatalogReportDefinition = Pick<
	CustomReportDto,
	"id" | "fileName" | "source" | "updatedAt" | "createdAt" | "contentType" | "sizeBytes" | "active"
> & {
	kind: string;
	definition: ReportDefinition<ReportConfig>;
};

const definitionCache = new Map<string, Promise<ReportDefinition<ReportConfig>>>();
let typescriptPromise: Promise<TypeScriptModule> | null = null;
let zodPromise: Promise<ZodModule> | null = null;
let catalogDefinitionsPromise: Promise<CatalogReportDefinition[]> | null = null;

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

const prependRuntimeShims = (source: string): string => `const defineReportDefinition = (value) => value;
const z = window.__MLSUITE_CUSTOM_REPORT_ZOD__;
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

function assertReportDefinition(
	value: unknown,
): asserts value is ReportDefinition<ReportConfig> {
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

const resolveDefinitionExport = (
	moduleValue: unknown,
): ReportDefinition<ReportConfig> => {
	if (!isRecord(moduleValue) || !("default" in moduleValue)) {
		throw new Error("Custom report module must export exactly one default report definition.");
	}

	const definition: unknown = moduleValue.default;
	assertReportDefinition(definition);
	return definition;
};

const importDefinitionFromSource = async (
	source: string,
): Promise<ReportDefinition<ReportConfig>> => {
	const [outputText, zod] = await Promise.all([transpileSource(source), loadZod()]);
	const blob = new Blob([outputText], { type: "text/javascript" });
	const url = URL.createObjectURL(blob);
	const previousZod = window.__MLSUITE_CUSTOM_REPORT_ZOD__;

	try {
		window.__MLSUITE_CUSTOM_REPORT_ZOD__ = zod;
		const moduleValue = await import(/* @vite-ignore */ url);
		return resolveDefinitionExport(moduleValue);
	} finally {
		window.__MLSUITE_CUSTOM_REPORT_ZOD__ = previousZod;
		URL.revokeObjectURL(url);
	}
};

const resolveCustomReportDefinition = async (
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

const assertUniqueKinds = (definitions: readonly CatalogReportDefinition[]): void => {
	const seenKinds = new Map<string, string>();

	for (const definition of definitions) {
		const previous = seenKinds.get(definition.kind);
		if (previous) {
			throw new Error(
				`Duplicate custom report kind "${definition.kind}" in catalog (${previous}, ${definition.fileName}).`,
			);
		}

		seenKinds.set(definition.kind, definition.fileName);
	}
};

const toCatalogDefinition = async (item: CustomReportDto): Promise<CatalogReportDefinition> => {
	const definition = await resolveCustomReportDefinition(item.source);
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
	const probe = definition.schema.safeParse({
		kind: definition.kind,
		label: "Preview report",
	});

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

export const invalidateActiveCustomReportDefinition = (): void => {
	catalogDefinitionsPromise = null;
};

export const getCatalogReportDefinitions = async (): Promise<
	readonly CatalogReportDefinition[]
> => {
	catalogDefinitionsPromise ??= getCustomReports().then(async (items) => {
		const definitions = await Promise.all(items.map((item) => toCatalogDefinition(item)));
		assertUniqueKinds(definitions);
		return definitions;
	});

	return catalogDefinitionsPromise;
};

export const getActiveCustomReportDefinitions = async (): Promise<
	readonly CatalogReportDefinition[]
> => {
	const catalogDefinitions = await getCatalogReportDefinitions();
	return catalogDefinitions.filter((definition) => definition.active);
};
