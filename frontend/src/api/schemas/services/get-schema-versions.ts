/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/api/core/services/app-fetch";
import type { SchemaVersionDto } from "@/api/schemas/dtos";

export const getSchemaVersions = (schemaId: string): Promise<SchemaVersionDto[]> =>
  appFetch<SchemaVersionDto[]>(`/api/schemas/${encodeURIComponent(schemaId)}/versions`);
