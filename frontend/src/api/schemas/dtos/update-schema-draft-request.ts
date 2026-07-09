/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { JsonRecord } from "./json-record";
import type { SchemaDraftBindingDto } from "./schema-draft-binding-dto";

export type UpdateSchemaDraftRequest = {
  expectedDraftRevision: number;
  name: string;
  formSchema: JsonRecord;
  bindings: SchemaDraftBindingDto[];
};
