/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { JsonRecord } from "./index";

export type SchemaModelBindingDto = {
  id?: string;
  schemaVersionId?: string;
  modelId: string;
  modelName?: string;
  pluginPolicy?: JsonRecord | null;
};
