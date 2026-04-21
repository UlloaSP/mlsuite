/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { FieldConfig, FieldDefinition } from "mlform/engine";
import { getCustomFields, type CustomFieldDto } from "../../api/customFieldService";

type TypeScriptModule = typeof import("typescript");
type ZodModule = typeof import("zod");

declare global {
	interface Window {
		__MLSUITE_CUSTOM_FIELD_ZOD__?: ZodModule;
	}
}

export const CUSTOM_FIELD_COMPONENT = "mlsuite-custom-field";

export type CatalogFieldDefinition = Pick<
	CustomFieldDto,
	"id" | "fileName" | "source" | "updatedAt" | "createdAt" | "contentType" | "sizeBytes" | "active"
> & {
	kind: string;
	definition: FieldDefinition<FieldConfig, unknown>;
};

const definitionCache = new Map<string, Promise<FieldDefinition<FieldConfig, unknown>>>();
let typescriptPromise: Promise<TypeScriptModule> | null = null;
let zodPromise: Promise<ZodModule> | null = null;
let catalogDefinitionsPromise: Promise<CatalogFieldDefinition[]> | null = null;

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

const prependRuntimeShims = (source: string): string => `const defineFieldDefinition = (value) => value;
const z = window.__MLSUITE_CUSTOM_FIELD_ZOD__;
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

function assertFieldDefinition(
	value: unknown,
): asserts value is FieldDefinition<FieldConfig, unknown> {
	if (!isRecord(value)) {
		throw new Error("Custom field module must export a default field definition.");
	}

	if (typeof value.kind !== "string" || value.kind.trim().length === 0) {
		throw new Error('Custom field definition must define non-empty string "kind".');
	}

	if (!isRecord(value.schema) || typeof value.schema.safeParse !== "function") {
		throw new Error('Custom field definition must expose Zod schema as "schema".');
	}

	if (typeof value.describe !== "function") {
		throw new Error('Custom field definition must expose "describe(config, ctx)".');
	}
}

const resolveDefinitionExport = (
	moduleValue: unknown,
): FieldDefinition<FieldConfig, unknown> => {
	if (!isRecord(moduleValue) || !("default" in moduleValue)) {
		throw new Error("Custom field module must export exactly one default field definition.");
	}

	const definition: unknown = moduleValue.default;
	assertFieldDefinition(definition);
	return definition;
};

const importDefinitionFromSource = async (
	source: string,
): Promise<FieldDefinition<FieldConfig, unknown>> => {
	const [outputText, zod] = await Promise.all([transpileSource(source), loadZod()]);
	const blob = new Blob([outputText], { type: "text/javascript" });
	const url = URL.createObjectURL(blob);
	const previousZod = window.__MLSUITE_CUSTOM_FIELD_ZOD__;

	try {
		window.__MLSUITE_CUSTOM_FIELD_ZOD__ = zod;
		const moduleValue = await import(/* @vite-ignore */ url);
		return resolveDefinitionExport(moduleValue);
	} finally {
		window.__MLSUITE_CUSTOM_FIELD_ZOD__ = previousZod;
		URL.revokeObjectURL(url);
	}
};

const resolveCustomFieldDefinition = async (
	source: string,
): Promise<FieldDefinition<FieldConfig, unknown>> => {
	const cacheKey = hashString(source);
	let cachedModule = definitionCache.get(cacheKey);

	if (!cachedModule) {
		cachedModule = importDefinitionFromSource(source);
		definitionCache.set(cacheKey, cachedModule);
	}

	return cachedModule;
};

const assertUniqueKinds = (definitions: readonly CatalogFieldDefinition[]): void => {
	const seenKinds = new Map<string, string>();

	for (const definition of definitions) {
		const previous = seenKinds.get(definition.kind);
		if (previous) {
			throw new Error(
				`Duplicate custom field kind "${definition.kind}" in catalog (${previous}, ${definition.fileName}).`,
			);
		}

		seenKinds.set(definition.kind, definition.fileName);
	}
};

const toCatalogDefinition = async (item: CustomFieldDto): Promise<CatalogFieldDefinition> => {
	const definition = await resolveCustomFieldDefinition(item.source);
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

export const customFieldTemplate = `export default defineFieldDefinition({
  kind: "custom-slider",
  schema: z
    .object({
      kind: z.literal("custom-slider"),
      id: z.string().optional(),
      label: z.string(),
      description: z.string().optional(),
      min: z.number().default(0),
      max: z.number().default(100),
      step: z.number().positive().default(1),
      defaultValue: z.number().optional(),
    })
    .passthrough(),
  getDefaultValue: (config) => config.defaultValue ?? config.min ?? 0,
  normalizeValue: (value, config) => {
    const fallback = config.defaultValue ?? config.min ?? 0;
    const numeric = typeof value === "number" ? value : Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  },
  describe: (config, context) => ({
    component: "${CUSTOM_FIELD_COMPONENT}",
    props: {
      mode: "range",
      min: config.min ?? 0,
      max: config.max ?? 100,
      step: config.step ?? 1,
      value: context.state.value,
      state: context.state.status,
    },
  }),
});
`;

export const validateCustomFieldSource = async (
	source: string,
): Promise<FieldDefinition<FieldConfig, unknown>> => {
	const definition = await resolveCustomFieldDefinition(source);
	const probe = definition.schema.safeParse({
		kind: definition.kind,
		label: "Preview field",
	});

	if (probe.success) {
		const descriptor = definition.describe(probe.data, {
			fieldId: "preview-field",
			state: {
				value: undefined,
				initialValue: undefined,
				touched: false,
				dirty: false,
				valid: true,
				visible: true,
				disabled: false,
				readOnly: false,
				errors: [],
				status: "idle",
			},
		});

		if (descriptor.component !== CUSTOM_FIELD_COMPONENT) {
			throw new Error(
				`Custom field kind "${definition.kind}" must use shared renderer "${CUSTOM_FIELD_COMPONENT}".`,
			);
		}
	}

	return definition;
};

export const invalidateActiveCustomFieldDefinition = (): void => {
	catalogDefinitionsPromise = null;
};

export const getCatalogFieldDefinitions = async (): Promise<
	readonly CatalogFieldDefinition[]
> => {
	catalogDefinitionsPromise ??= getCustomFields().then(async (items) => {
		const definitions = await Promise.all(items.map((item) => toCatalogDefinition(item)));
		assertUniqueKinds(definitions);
		return definitions;
	});

	return catalogDefinitionsPromise;
};

export const getActiveCustomFieldDefinitions = async (): Promise<
	readonly CatalogFieldDefinition[]
> => {
	const catalogDefinitions = await getCatalogFieldDefinitions();
	return catalogDefinitions.filter((definition) => definition.active);
};
