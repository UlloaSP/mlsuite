/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import type { SchemaVersionDto } from "@/api/schemas/dtos";

export const getSchemaVersion = (
  versionId: string,
  signal?: AbortSignal,
): Promise<SchemaVersionDto> =>
  appFetch<SchemaVersionDto>(`/api/schema-versions/${encodeURIComponent(versionId)}`, { signal });
