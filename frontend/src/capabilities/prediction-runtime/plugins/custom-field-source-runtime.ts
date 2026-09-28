/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { defineFieldKind, type DefinedFieldKind } from "mlform/kit";
import type { FieldConfig } from "mlform/runtime";
import { compilePluginSource } from "@/capabilities/prediction-runtime/plugins/plugin-source-compiler";

export type CustomFieldKind = DefinedFieldKind<FieldConfig, unknown>;

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
  const probe = definition.schema.safeParse({ kind: definition.kind, label: "Preview field" });
  if (probe.success && definition.describe) {
    definition.describe(
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
