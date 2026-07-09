/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { SchemaDraftMergeResolutionDto } from "./schema-draft-merge-resolution-dto";

export type SchemaDraftMergeRequest = {
  expectedCurrentVersionId: string | number;
  expectedCurrentDocumentHash: string;
  expectedDraftRevision: number;
  resolutions: SchemaDraftMergeResolutionDto[];
};
