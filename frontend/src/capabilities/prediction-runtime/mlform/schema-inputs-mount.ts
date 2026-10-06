/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { mountForm } from "mlform/kit";
import { createBuiltinPrimitiveRegistry } from "mlform/primitives";
import { validateSchema } from "mlform/schema";
import { getBuiltinRegistry } from "@/capabilities/prediction-runtime/mlform/builtin-registry";
import { withResolvedDisplayKeys } from "@/capabilities/prediction-runtime/mlform/display-key";
import { getPredictionDesignSystem } from "@/capabilities/prediction-runtime/mlform/headless-prediction";
import type { PredictionTheme } from "@/capabilities/prediction-runtime/mlform/shared";

type Options = {
  container: HTMLElement;
  /** A form schema reduced to its built-in `fields`: no reports, no model routing. */
  schema: unknown;
  theme: PredictionTheme;
};

export type MountedSchemaInputs = {
  updateTheme: (theme: PredictionTheme) => void;
  unmount: () => void;
};

/**
 * MLForm puts its submit button in the `actions` part. A host that mounts inputs only
 * hides that part on its container with this class, so the form offers nothing to run.
 */
export const MLFORM_INPUTS_ONLY_CONTAINER_CLASS = "[&_mlf-form::part(actions)]:hidden";

/** The kit requires a transport; with the submit action hidden nothing reaches it. */
const noRunTransport = {
  submit: async (): Promise<never> => {
    throw new Error("This form cannot be run here.");
  },
};

/** Mounts a schema's inputs to be filled, with no reports and no way to submit them. */
export const mountSchemaInputs = ({ container, schema, theme }: Options): MountedSchemaInputs => {
  const registry = getBuiltinRegistry();
  const result = validateSchema(withResolvedDisplayKeys(schema), registry);
  if (!result.success) throw new Error(result.issues[0]?.message ?? "Invalid MLForm schema.");
  const mounted = mountForm(container, {
    schema: result.data,
    registry,
    primitiveRegistry: createBuiltinPrimitiveRegistry(),
    transport: noRunTransport,
    reportPane: "hidden",
    reportFetchMode: "none",
    designSystem: getPredictionDesignSystem(theme),
  });
  return {
    updateTheme: (nextTheme) => mounted.replaceDesignSystem(getPredictionDesignSystem(nextTheme)),
    unmount: () => mounted.unmount(),
  };
};
