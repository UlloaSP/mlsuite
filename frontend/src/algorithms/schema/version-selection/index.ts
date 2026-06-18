/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { SchemaVersionDto } from "../../../schemas/types";

export const schemaVersionId = (version: Pick<SchemaVersionDto, "id"> | null | undefined) =>
  version?.id == null ? "" : String(version.id);

export const sortSchemaVersions = (versions: SchemaVersionDto[]) =>
  Array.from(versions).sort((a, b) => b.version - a.version);

export const selectSchemaVersion = (
  versions: SchemaVersionDto[],
  selectedId: string,
): SchemaVersionDto | undefined => {
  const sorted = sortSchemaVersions(versions);
  return sorted.find((version) => schemaVersionId(version) === selectedId) ?? sorted[0];
};
