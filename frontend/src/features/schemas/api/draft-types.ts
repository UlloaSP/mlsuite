/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { JsonRecord, SchemaVersionDto } from "./schema-types";

export type SchemaDraftStatus = "DRAFT" | "CONFLICT" | "PUBLISHED";

export type SchemaDraftDto = {
  id: string;
  schemaId: string;
  baseVersionId: string;
  baseVersion: number;
  name: string;
  formSchema: JsonRecord;
  bindings: SchemaDraftBindingDto[];
  status: SchemaDraftStatus;
  revision: number;
  createdAt: string;
  updatedAt: string;
};

export type SchemaDraftBindingDto = {
  modelId: string | number;
  modelName?: string;
  pluginPolicy?: JsonRecord;
};

export type CreateSchemaDraftRequest = {
  name: string;
  baseVersionId: string | number;
};

export type UpdateSchemaDraftRequest = {
  expectedDraftRevision: number;
  name: string;
  formSchema: JsonRecord;
  bindings: SchemaDraftBindingDto[];
};

export type SchemaDraftDiffDto = {
  baseVersionId: string;
  currentVersionId: string;
  currentDocumentHash: string;
  hasConflicts: boolean;
  changes: SchemaDraftChangeDto[];
};

export type SchemaDraftChangeDto = {
  path: string;
  baseValue: unknown;
  basePresent: boolean;
  draftValue: unknown;
  draftPresent: boolean;
  currentValue: unknown;
  currentPresent: boolean;
  draftChanged: boolean;
  conflict: boolean;
};

export type SchemaDraftMergeRequest = {
  expectedCurrentVersionId: string | number;
  expectedCurrentDocumentHash: string;
  expectedDraftRevision: number;
  resolutions: SchemaDraftMergeResolutionDto[];
};

export type SchemaDraftMergeResolutionDto = {
  path: string;
  side: SchemaDraftMergeSide;
};

export type SchemaDraftMergeSide = "current" | "incoming";

export type SchemaDraftMergeResultDto = {
  draft: SchemaDraftDto;
  diff: SchemaDraftDiffDto;
};

export type SchemaDraftPublishResultDto = {
  status: "published" | "conflict";
  draft: SchemaDraftDto;
  version?: SchemaVersionDto | null;
  diff?: SchemaDraftDiffDto | null;
};
