/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { SchemaVersionDto } from "../../../api/schemas/dtos";

/**
 * schemaVersionId: performs the exported transformation for this algorithm.
 *
 * Purpose: sorts and selects schema versions.
 * @param version - Input consumed by schemaVersionId; uses the sorts and selects schema versions contract.
 * @param value - Input consumed by schemaVersionId; uses the sorts and selects schema versions contract.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const schemaVersionId = (version: Pick<SchemaVersionDto, "id"> | null | undefined) =>
  version?.id == null ? "" : String(version.id);

/**
 * sortSchemaVersions: returns data ordered by domain rules
 *
 * Purpose: sorts and selects schema versions.
 * @param versions - Input consumed by sortSchemaVersions; uses the sorts and selects schema versions contract.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const sortSchemaVersions = (versions: SchemaVersionDto[]) =>
  Array.from(versions).sort((a, b) => b.version - a.version);

/**
 * selectSchemaVersion: chooses one item according to domain ordering rules
 *
 * Purpose: sorts and selects schema versions.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const selectSchemaVersion = (
  versions: SchemaVersionDto[],
  selectedId: string,
): SchemaVersionDto | undefined => {
  const sorted = sortSchemaVersions(versions);
  return sorted.find((version) => schemaVersionId(version) === selectedId) ?? sorted[0];
};
