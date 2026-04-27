/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { FieldConfig, FieldDefinition } from "mlform/engine";

type TypeScriptModule = typeof import("typescript");
type ZodModule = typeof import("zod");

declare global {
	interface Window {
		__MLSUITE_CUSTOM_FIELD_ZOD__?: ZodModule;
	}
}

export const CUSTOM_FIELD_COMPONENT = "mlsuite-custom-field";

const definitionCache = new Map<string, Promise<FieldDefinition<FieldConfig, unknown>>>();
let typescriptPromise: Promise<TypeScriptModule> | null = null;
let zodPromise: Promise<ZodModule> | null = null;
const zodGlobalPrefix = "__MLSUITE_CUSTOM_FIELD_ZOD__";

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

const prependRuntimeShims = (source: string, zodGlobalKey: string): string => `const defineFieldDefinition = (value) => value;
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

function assertFieldDefinition(value: unknown): asserts value is FieldDefinition<FieldConfig, unknown> {
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

const importDefinitionFromSource = async (source: string): Promise<FieldDefinition<FieldConfig, unknown>> => {
	const [outputText, zod] = await Promise.all([transpileSource(source), loadZod()]);
	const blob = new Blob([outputText], { type: "text/javascript" });
	const url = URL.createObjectURL(blob);
	const zodGlobalKey = getZodGlobalKey(source);
	try {
		(globalThis as Record<string, unknown>)[zodGlobalKey] = zod;
		const moduleValue = await import(/* @vite-ignore */ url);
		if (!isRecord(moduleValue) || !("default" in moduleValue)) {
			throw new Error("Custom field module must export exactly one default field definition.");
		}
		const definition: unknown = moduleValue.default;
		assertFieldDefinition(definition);
		return definition;
	} finally {
		delete (globalThis as Record<string, unknown>)[zodGlobalKey];
		URL.revokeObjectURL(url);
	}
};

export const resolveCustomFieldDefinition = async (
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
	const probe = definition.schema.safeParse({ kind: definition.kind, label: "Preview field" });
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
