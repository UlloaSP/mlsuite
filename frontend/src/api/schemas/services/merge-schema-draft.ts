/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import { json } from "@/shared/api/http";
import type { SchemaDraftMergeRequest, SchemaDraftMergeResultDto } from "@/api/schemas/dtos";

export const mergeSchemaDraft = (
  draftId: string,
  request: SchemaDraftMergeRequest,
): Promise<SchemaDraftMergeResultDto> =>
  appFetch<SchemaDraftMergeResultDto>(
    `/api/schema-drafts/${encodeURIComponent(draftId)}/merge`,
    json("POST", request),
  );
