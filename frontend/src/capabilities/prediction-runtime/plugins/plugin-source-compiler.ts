/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { Diagnostic } from "typescript";
import * as zod from "zod";
import { isRecord } from "@/capabilities/prediction-runtime/mlform/shared";
import { memoizeCompiledPlugin } from "@/capabilities/prediction-runtime/plugins/plugin-runtime-cache";

type TypeScriptModule = typeof import("typescript");

type CompileSpec = {
  plugin: "field" | "report";
  /** MLForm helper the plugin source calls, e.g. `defineFieldKind`. */
  defineName: string;
  define: (value: never) => unknown;
};

const hashString = (value: string): string => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
};

const formatDiagnostics = (ts: TypeScriptModule, diagnostics: readonly Diagnostic[]): string =>
  diagnostics.length === 0
    ? "Unknown TypeScript error."
    : diagnostics
        .map((diagnostic) => {
          const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
          if (!diagnostic.file || diagnostic.start === undefined) return message;
          const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
          return `L${position.line + 1}:C${position.character + 1} ${message}`;
        })
        .join("\n");

const transpileSource = async (
  source: string,
  defineName: string,
  zodKey: string,
  defineKey: string,
): Promise<string> => {
  const ts = await import("typescript");
  // Plugin sources use `z` and the define helper as free identifiers. Blob-URL modules
  // cannot import app chunks, so bind both to per-source globals set around the import.
  const shimmed = `const ${defineName} = (value) => globalThis[${JSON.stringify(defineKey)}](value);
const z = globalThis[${JSON.stringify(zodKey)}];
${source}`;
  const result = ts.transpileModule(shimmed, {
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

const assertDefinition = (value: unknown, { plugin, defineName }: CompileSpec): void => {
  const label = `Custom ${plugin}`;
  if (!isRecord(value)) {
    throw new Error(`${label} module must export a default ${plugin} definition.`);
  }
  if (typeof value.kind !== "string" || value.kind.trim().length === 0) {
    throw new Error(`${label} definition must define non-empty string "kind".`);
  }
  if (
    value.category !== plugin ||
    typeof value.register !== "function" ||
    !isRecord(value.definition) ||
    !isRecord(value.presenter)
  ) {
    throw new Error(`${label} module must export MLForm ${defineName}(...).`);
  }
  if (
    !isRecord(value.definition.schema) ||
    typeof value.definition.schema.safeParse !== "function"
  ) {
    throw new Error(`${label} definition must expose a Zod config schema.`);
  }
  if (typeof value.presenter.describe !== "function") {
    throw new Error(`${label} presenter must expose "describe(config, ctx)".`);
  }
};

const importDefinition = async (source: string, spec: CompileSpec): Promise<unknown> => {
  const hash = hashString(source);
  const kind = spec.plugin.toUpperCase();
  const zodKey = `__MLSUITE_CUSTOM_${kind}_ZOD___${hash}`;
  const defineKey = `__MLSUITE_DEFINE_${kind}_KIND__${hash}`;
  const outputText = await transpileSource(source, spec.defineName, zodKey, defineKey);
  const url = URL.createObjectURL(new Blob([outputText], { type: "text/javascript" }));
  const globals = globalThis as Record<string, unknown>;
  try {
    globals[zodKey] = zod;
    globals[defineKey] = spec.define;
    // react-doctor-disable-next-line react-doctor/no-dynamic-import-path -- Runtime plugin modules are compiled to Blob URLs; no static chunk path exists.
    const moduleValue: unknown = await import(/* @vite-ignore */ url);
    if (!isRecord(moduleValue) || !("default" in moduleValue)) {
      throw new Error(
        `Custom ${spec.plugin} module must export exactly one default ${spec.plugin} definition.`,
      );
    }
    assertDefinition(moduleValue.default, spec);
    return moduleValue.default;
  } finally {
    delete globals[zodKey];
    delete globals[defineKey];
    URL.revokeObjectURL(url);
  }
};

/** Compiles one plugin source once per organization and source content. */
export const compilePluginSource = (
  organizationId: number | string,
  source: string,
  spec: CompileSpec,
): Promise<unknown> =>
  memoizeCompiledPlugin(organizationId, `${spec.plugin}-source:${hashString(source)}`, () =>
    importDefinition(source, spec),
  );
