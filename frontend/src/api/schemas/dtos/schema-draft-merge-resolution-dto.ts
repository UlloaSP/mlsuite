/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { SchemaDraftMergeSide } from "./schema-draft-merge-side";

export type SchemaDraftMergeResolutionDto = {
  path: string;
  side: SchemaDraftMergeSide;
};
