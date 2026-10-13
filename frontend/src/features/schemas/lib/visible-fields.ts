/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { isRecord } from "@/capabilities/prediction-runtime/mlform/shared";
import type { JsonRecord } from "@/features/schemas/api/schema-types";

export const countVisibleSchemaFields = (schema: JsonRecord | undefined): number => {
  const fields = Array.isArray(schema?.fields) ? schema.fields.filter(isRecord) : [];
  return fields.filter((field) => field.hidden !== true).length;
};
