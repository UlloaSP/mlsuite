/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { defineFieldKind, type DefinedFieldKind } from "mlform/view";
import { compilePluginSource } from "@/capabilities/prediction-runtime/plugins/plugin-source-compiler";

// Catalog kinds have different config and value types, validated by their definitions.
export type CustomFieldKind = DefinedFieldKind<any, any>;

export const resolveCustomFieldDefinition = (
  organizationId: number | string,
  source: string,
): Promise<CustomFieldKind> =>
  compilePluginSource(organizationId, source, {
    plugin: "field",
    defineName: "defineFieldKind",
    define: defineFieldKind,
  }) as Promise<CustomFieldKind>;

export const validateCustomFieldSource = async (
  organizationId: number | string,
  source: string,
): Promise<CustomFieldKind> => {
  const definition = await resolveCustomFieldDefinition(organizationId, source);
  const probe = definition.definition.schema.safeParse({
    kind: definition.kind,
    label: "Preview field",
  });
  if (probe.success) {
    definition.presenter.describe(
      { ...probe.data, id: "preview-field" },
      {
        fieldId: "preview-field",
        state: { value: undefined, errors: [], status: "idle" },
        value: undefined,
      },
    );
  }
  return definition;
};
