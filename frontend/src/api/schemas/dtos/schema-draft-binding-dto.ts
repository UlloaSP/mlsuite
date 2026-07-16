/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { JsonRecord } from "./json-record";

export type SchemaDraftBindingDto = {
  modelId: string | number;
  modelName?: string;
  pluginPolicy?: JsonRecord;
};
