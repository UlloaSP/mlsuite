/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { PluginRuntimeSourceDto, SchemaModelBindingDto } from "@/shared/api/openapi.gen";
import { openPluginSandbox, type PluginSandbox } from "./plugin-sandbox";
import type { PluginCatalog, ResultOf, SandboxMethods } from "./sandbox-protocol";

type PluginSource = Pick<PluginRuntimeSourceDto, "fileName" | "source">;

const openHiddenSandbox = (title: string) =>
  openPluginSandbox({ container: document.body, title, sizing: "hidden" });

const withHiddenSandbox = async <T>(
  title: string,
  use: (sandbox: PluginSandbox) => Promise<T>,
): Promise<T> => {
  const sandbox = openHiddenSandbox(title);
  try {
    return await use(sandbox);
  } finally {
    sandbox.destroy();
  }
};

const inspect = (sources: readonly PluginSource[]) =>
  withHiddenSandbox("Plugin check", (sandbox) =>
    sandbox.request("inspect", {
      sources: sources.map(({ fileName, source }) => ({ fileName, source })),
    }),
  );

/** Compiles one plugin file in the sandbox and tells which kind of plugin it defines. */
export const inspectPluginSource = async (source: PluginSource) => {
  const [detected] = await inspect([source]);
  if (!detected) throw new Error("The plugin sandbox did not check the plugin.");
  return detected;
};

/**
 * An organization's plugins split into field and report kinds, as data. Each source is compiled
 * and checked in the sandbox; one that fails, or two of one kind, fail the catalog.
 */
export const inspectPluginCatalog = async (
  sources: readonly PluginSource[],
): Promise<PluginCatalog> => {
  if (sources.length === 0) return { fields: [], reports: [] };
  const detected = await inspect(sources);
  if (detected.length !== sources.length)
    throw new Error("The plugin sandbox did not check every plugin.");
  const catalog: PluginCatalog = { fields: [], reports: [] };
  sources.forEach(({ fileName, source }, index) => {
    const { pluginType, kind } = detected[index];
    catalog[pluginType === "field" ? "fields" : "reports"].push({ fileName, source, kind });
  });
  return catalog;
};

/**
 * What a run of the schema sends to its models: the fields and reports the schema normalizes to
 * with its plugins, for running values that no form collected (a bulk upload).
 */
export const prepareSchemaRun = (
  schema: unknown,
  bindings: readonly Pick<SchemaModelBindingDto, "modelId" | "modelName" | "pluginPolicy">[],
  plugins: PluginCatalog,
): Promise<ResultOf<SandboxMethods, "prepare-run">> =>
  withHiddenSandbox("Schema check", (sandbox) =>
    sandbox.request("prepare-run", {
      schema,
      bindings: bindings.map(({ modelId, modelName, pluginPolicy }) => ({
        modelId,
        modelName,
        pluginPolicy,
      })),
      plugins,
    }),
  );

export type SchemaChecker = {
  check(schema: unknown, plugins: PluginCatalog): Promise<ResultOf<SandboxMethods, "check-schema">>;
  jsonSchema(plugins: PluginCatalog): Promise<ResultOf<SandboxMethods, "json-schema">>;
  close(): void;
};

/** A sandbox kept open while a schema editor is, to check each change against the plugins. */
export const openSchemaChecker = (): SchemaChecker => {
  const sandbox = openHiddenSandbox("Schema check");
  return {
    check: (schema, plugins) => sandbox.request("check-schema", { schema, plugins }),
    jsonSchema: (plugins) => sandbox.request("json-schema", { plugins }),
    close: () => sandbox.destroy(),
  };
};
