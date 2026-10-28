/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { createSchemaRunRuntime } from "@/capabilities/prediction-runtime/mlform/runtime-assembly";
import { createSchemaRunTransport } from "@/capabilities/prediction-runtime/mlform/run-transport";
import { mountSchemaRunForm } from "@/capabilities/prediction-runtime/mlform/schema-run-mount";
import { RUN_TARGET } from "./api-fixtures";

type Options = Parameters<typeof createSchemaRunRuntime>[0] & {
  bindings: Parameters<typeof createSchemaRunTransport>[1];
};

/**
 * A run as the app makes one: the schema normalized with its plugins (in the sandbox, in the
 * app) and the normalized fields run through the app's transport for `RUN_TARGET`.
 */
export const schemaRunRuntime = (options: Options) => {
  const runtime = createSchemaRunRuntime(options);
  return {
    ...runtime,
    transport: createSchemaRunTransport(RUN_TARGET, options.bindings, runtime.normalizedFields),
  };
};

/** A run form mounted as the sandbox mounts one, its runs made by the app's transport. */
export const mountRunForm = (
  options: Omit<Parameters<typeof mountSchemaRunForm>[0], "transport">,
) =>
  mountSchemaRunForm({
    ...options,
    transport: (fields) => createSchemaRunTransport(RUN_TARGET, options.bindings, fields),
  });
