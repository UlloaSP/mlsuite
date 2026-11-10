/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { snapshotLabel } from "@/shared/lib/snapshot-label";
import type { SchemaVersionDto } from "@/shared/api/openapi.gen";

export const schemaVersionId = (version: Pick<SchemaVersionDto, "id"> | null | undefined) =>
  version?.id == null ? "" : String(version.id);

/** Snapshot names are optional in the API; an unnamed snapshot reads as its number. */
export const schemaVersionName = (version: Pick<SchemaVersionDto, "name" | "version">) =>
  version.name || `v${version.version}`;

/** "Baseline · v3", or "v3" alone for a snapshot named after its number or not at all. */
export const schemaVersionLabel = (version: Pick<SchemaVersionDto, "name" | "version">) =>
  snapshotLabel(version.name, version.version);

/** Whether a snapshot's name says more than its number, so both are worth showing. */
export const hasOwnVersionName = (version: Pick<SchemaVersionDto, "name" | "version">) =>
  schemaVersionLabel(version) !== `v${version.version}`;
