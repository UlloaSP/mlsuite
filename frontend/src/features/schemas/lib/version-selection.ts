/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { SchemaVersionDto } from "@/shared/api/openapi.gen";

export const schemaVersionId = (version: Pick<SchemaVersionDto, "id"> | null | undefined) =>
  version?.id == null ? "" : String(version.id);

/** Snapshot names are optional in the API; an unnamed snapshot reads as its number. */
export const schemaVersionName = (version: Pick<SchemaVersionDto, "name" | "version">) =>
  version.name || `v${version.version}`;

export const sortSchemaVersions = (versions: SchemaVersionDto[]) =>
  Array.from(versions).sort((a, b) => b.version - a.version);

export const latestSchemaVersion = (versions: SchemaVersionDto[]): SchemaVersionDto | undefined =>
  sortSchemaVersions(versions)[0];
