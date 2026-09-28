/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { SchemaVersionDto } from "@/features/schemas/api/schema-types";

export const schemaVersionId = (version: Pick<SchemaVersionDto, "id"> | null | undefined) =>
  version?.id == null ? "" : String(version.id);

export const sortSchemaVersions = (versions: SchemaVersionDto[]) =>
  Array.from(versions).sort((a, b) => b.version - a.version);

export const latestSchemaVersion = (versions: SchemaVersionDto[]): SchemaVersionDto | undefined =>
  sortSchemaVersions(versions)[0];
