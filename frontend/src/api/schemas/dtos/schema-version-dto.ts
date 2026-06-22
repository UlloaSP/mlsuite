/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { JsonRecord, SchemaModelBindingDto } from "./index";

export type SchemaVersionDto = {
  id: string;
  schemaId: string;
  version: number;
  name: string;
  formSchema: JsonRecord;
  bindings: SchemaModelBindingDto[];
  createdAt: string;
};
