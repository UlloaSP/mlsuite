/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import { json } from "../../core/services/json";
import type { SchemaDraftMergeRequest, SchemaDraftMergeResultDto } from "../dtos";

export const mergeSchemaDraft = (
  draftId: string,
  request: SchemaDraftMergeRequest,
): Promise<SchemaDraftMergeResultDto> =>
  appFetch<SchemaDraftMergeResultDto>(
    `/api/schema-drafts/${encodeURIComponent(draftId)}/merge`,
    json("POST", request),
  );
