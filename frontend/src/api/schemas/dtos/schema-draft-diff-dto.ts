/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { SchemaDraftChangeDto } from "./schema-draft-change-dto";

export type SchemaDraftDiffDto = {
  baseVersionId: string;
  currentVersionId: string;
  currentDocumentHash: string;
  hasConflicts: boolean;
  changes: SchemaDraftChangeDto[];
};
