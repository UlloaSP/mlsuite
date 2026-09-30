/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export interface DuplicateSchemaRequest {
  id: number | string;
  name: string;
  versionId?: number;
}

export type JsonRecord = Record<string, unknown>;

export interface SchemaNameRequest {
  id: number | string;
  name: string;
}

export interface SchemaPageRequest {
  page: number;
  search?: string;
  size: number;
  sort?: string;
  status?: string;
}
