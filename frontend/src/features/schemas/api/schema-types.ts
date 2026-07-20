/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type CreateSchemaBookmarkRequest = {
  name: string;
  versionId: string;
};

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type CreateSchemaRequest = {
  name: string;
  description?: string;
};

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type CreateSchemaVersionRequest = {
  name: string;
  formSchema: JsonRecord;
  bindings: Array<{
    modelId: string;
    modelName?: string;
    pluginPolicy?: JsonRecord;
  }>;
};

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export interface DuplicateSchemaRequest {
  id: string;
  name: string;
  versionId?: string;
}

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type JsonRecord = Record<string, unknown>;

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type MoveSchemaBookmarkRequest = {
  versionId: string;
};

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type SchemaBookmarkDto = {
  id: string;
  schemaId: string;
  versionId: string;
  version: number;
  versionName: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type SchemaCatalogItemDto = {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt?: string;
  archivedAt?: string | null;
  updatedByName?: string | null;
  updatedByEmail?: string | null;
  updatedByAvatarUrl?: string | null;
  modelCount: number;
  fieldCount: number;
  reportCount: number;
};

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type SchemaDto = {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt?: string;
  archivedAt?: string | null;
};

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type SchemaModelBindingDto = {
  id?: string;
  schemaVersionId?: string;
  modelId: string;
  modelName?: string;
  pluginPolicy?: JsonRecord | null;
};

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export interface SchemaNameRequest {
  id: string;
  name: string;
}

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export interface SchemaPageDto {
  items: SchemaCatalogItemDto[];
  page: number;
  size: number;
  totalItems: number;
  hasNext: boolean;
}

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export interface SchemaPageRequest {
  page: number;
  search?: string;
  size: number;
  sort?: string;
  status?: string;
}

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type SchemaVersionDto = {
  id: string;
  schemaId: string;
  version: number;
  name: string;
  formSchema: JsonRecord;
  bindings: SchemaModelBindingDto[];
  createdAt: string;
};
