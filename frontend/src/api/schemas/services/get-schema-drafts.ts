/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import type { SchemaDraftDto } from "@/api/schemas/dtos";

export const getSchemaDrafts = (
  schemaId: string,
  signal?: AbortSignal,
): Promise<SchemaDraftDto[]> =>
  appFetch<SchemaDraftDto[]>(`/api/schemas/${encodeURIComponent(schemaId)}/drafts`, { signal });
