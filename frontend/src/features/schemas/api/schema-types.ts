/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type CreateSchemaBookmarkRequest = {
  name: string;
  versionId: string;
};

export type CreateSchemaRequest = {
  name: string;
  description?: string;
};

export type CreateSchemaWithInitialVersionRequest = {
  schema: CreateSchemaRequest;
  initialVersion: CreateSchemaVersionRequest;
};

export type CreateSchemaVersionRequest = {
  name: string;
  formSchema: JsonRecord;
  bindings: Array<{
    modelId: string;
    modelName?: string;
    pluginPolicy?: JsonRecord;
  }>;
};

export interface DuplicateSchemaRequest {
  id: string;
  name: string;
  versionId?: string;
}

export type JsonRecord = Record<string, unknown>;

/** A bookmark as the Predict launcher shows it: what it runs and how it has been used. */
export type PredictBookmarkDto = {
  id: string;
  name: string;
  schemaId: string;
  schemaName: string;
  schemaDescription?: string | null;
  versionId: string;
  version: number;
  versionName: string;
  /** The schema's newest snapshot; above `version` when the bookmark is behind. */
  latestVersion: number;
  models: string[];
  fieldCount: number;
  reportCount: number;
  runCount: number;
  lastRunAt?: string | null;
  updatedAt: string;
};

export type SchemaBookmarkDto = {
  id: string;
  schemaId: string;
  schemaName: string;
  versionId: string;
  version: number;
  versionName: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

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

export type SchemaDto = {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt?: string;
  archivedAt?: string | null;
};

export type SchemaModelBindingDto = {
  id?: string;
  schemaVersionId?: string;
  modelId: string;
  modelName?: string;
  pluginPolicy?: JsonRecord | null;
};

export interface SchemaNameRequest {
  id: string;
  name: string;
}

export interface SchemaPageDto {
  items: SchemaCatalogItemDto[];
  page: number;
  size: number;
  totalItems: number;
  hasNext: boolean;
}

export interface SchemaPageRequest {
  page: number;
  search?: string;
  size: number;
  sort?: string;
  status?: string;
}

export type SchemaVersionDto = {
  id: string;
  schemaId: string;
  version: number;
  name: string;
  formSchema: JsonRecord;
  bindings: SchemaModelBindingDto[];
  createdAt: string;
};
