/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import type { SchemaDraftDiffDto } from "@/api/schemas/dtos";

export const getSchemaDraftDiff = (
  draftId: string,
  signal?: AbortSignal,
): Promise<SchemaDraftDiffDto> =>
  appFetch<SchemaDraftDiffDto>(`/api/schema-drafts/${encodeURIComponent(draftId)}/diff`, {
    signal,
  });
