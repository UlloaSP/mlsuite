/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { SchemaDraftDiffDto } from "./schema-draft-diff-dto";
import type { SchemaDraftDto } from "./schema-draft-dto";
import type { SchemaVersionDto } from "./schema-version-dto";

export type SchemaDraftPublishResultDto = {
  status: "published" | "conflict";
  draft: SchemaDraftDto;
  version?: SchemaVersionDto | null;
  diff?: SchemaDraftDiffDto | null;
};
