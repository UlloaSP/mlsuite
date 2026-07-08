/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { JsonRecord } from "./json-record";
import type { SchemaDraftBindingDto } from "./schema-draft-binding-dto";
import type { SchemaDraftStatus } from "./schema-draft-status";

export type SchemaDraftDto = {
  id: string;
  schemaId: string;
  baseVersionId: string;
  baseVersion: number;
  name: string;
  formSchema: JsonRecord;
  bindings: SchemaDraftBindingDto[];
  status: SchemaDraftStatus;
  createdAt: string;
  updatedAt: string;
};
