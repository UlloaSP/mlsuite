/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { SchemaDraftDiffDto } from "./schema-draft-diff-dto";
import type { SchemaDraftDto } from "./schema-draft-dto";

export type SchemaDraftMergeResultDto = {
  draft: SchemaDraftDto;
  diff: SchemaDraftDiffDto;
};
