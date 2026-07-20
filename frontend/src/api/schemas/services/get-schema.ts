/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import type { SchemaDto } from "@/api/schemas/dtos";

export const getSchema = (schemaId: string, signal?: AbortSignal): Promise<SchemaDto> =>
  appFetch<SchemaDto>(`/api/schemas/${encodeURIComponent(schemaId)}`, { signal });
