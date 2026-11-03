/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { transform } from "sucrase";
import * as zod from "zod";
import { isRecord } from "@/capabilities/prediction-runtime/mlform/shared";

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

/** A syntax error as "L<line>:C<column> <message>", as the plugin editors show it. */
const syntaxError = (error: unknown): Error => {
  if (!(error instanceof Error)) return new Error(String(error));
  const loc = (error as Error & { loc?: { line: number; column: number } }).loc;
  // Sucrase ends its message with the position it also gives as loc.
  const message = error.message.replace(/ \(\d+:\d+\)$/, "");
  return new Error(loc ? `L${loc.line}:C${loc.column} ${message}` : message);
};

/**
 * Strips a plugin's TypeScript types (Sucrase checks syntax, not types) and keeps its ES module
 * and modern syntax as written.
 */
const transpileSource = (
  source: string,
  defineName: string,
  zodKey: string,
  defineKey: string,
): string => {
  // Plugin sources use `z` and the define helper as free identifiers. Blob-URL modules
  // cannot import bundled chunks, so bind both to per-source globals set around the import.
  const shimmed = `const ${defineName} = (value) => globalThis[${JSON.stringify(defineKey)}](value);
const z = globalThis[${JSON.stringify(zodKey)}];
${source}`;
  try {
    return transform(shimmed, { transforms: ["typescript"], disableESTransforms: true }).code;
  } catch (error) {
    throw syntaxError(error);
  }
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
  const outputText = transpileSource(source, spec.defineName, zodKey, defineKey);
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

const compiled = new Map<string, Promise<unknown>>();

/**
 * Compiles and runs one plugin source once per sandbox, which shows one organization's plugins
 * and is discarded with the view: a failed compilation is not kept, so a retry compiles again.
 * Only the plugin sandbox imports this module; the app never evaluates plugin code.
 */
export const compilePluginSource = (source: string, spec: CompileSpec): Promise<unknown> => {
  const key = `${spec.plugin}
${source}`;
  let definition = compiled.get(key);
  if (!definition) {
    definition = importDefinition(source, spec);
    compiled.set(key, definition);
    definition.catch(() => compiled.delete(key));
  }
  return definition;
};
