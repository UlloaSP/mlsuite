/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { JsonRecord } from "./index";

export type CreateSchemaVersionRequest = {
  name: string;
  formSchema: JsonRecord;
  bindings: Array<{
    modelId: string;
    modelName?: string;
    pluginPolicy?: JsonRecord;
  }>;
};
