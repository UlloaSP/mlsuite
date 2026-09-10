/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { JsonRecord, SchemaVersionDto } from "./schema-types";

export type SchemaDraftStatus = "DRAFT" | "CONFLICT" | "PUBLISHED";

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

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

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type SchemaDraftBindingDto = {
  modelId: string | number;
  modelName?: string;
  pluginPolicy?: JsonRecord;
};

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type CreateSchemaDraftRequest = {
  name: string;
  baseVersionId: string | number;
};

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type UpdateSchemaDraftRequest = {
  expectedDraftRevision: number;
  name: string;
  formSchema: JsonRecord;
  bindings: SchemaDraftBindingDto[];
};

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type SchemaDraftDiffDto = {
  baseVersionId: string;
  currentVersionId: string;
  currentDocumentHash: string;
  hasConflicts: boolean;
  changes: SchemaDraftChangeDto[];
};

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

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

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type SchemaDraftMergeRequest = {
  expectedCurrentVersionId: string | number;
  expectedCurrentDocumentHash: string;
  expectedDraftRevision: number;
  resolutions: SchemaDraftMergeResolutionDto[];
};

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type SchemaDraftMergeResolutionDto = {
  path: string;
  side: SchemaDraftMergeSide;
};

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type SchemaDraftMergeSide = "current" | "incoming";

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type SchemaDraftMergeResultDto = {
  draft: SchemaDraftDto;
  diff: SchemaDraftDiffDto;
};

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type SchemaDraftPublishResultDto = {
  status: "published" | "conflict";
  draft: SchemaDraftDto;
  version?: SchemaVersionDto | null;
  diff?: SchemaDraftDiffDto | null;
};
