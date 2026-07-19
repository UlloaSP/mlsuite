/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/api/core/services/app-fetch";
import { json } from "@/api/core/services/json";
import type { SchemaDraftPublishResultDto } from "@/api/schemas/dtos";

export const publishSchemaDraft = (
  draftId: string,
  expectedDraftRevision: number,
): Promise<SchemaDraftPublishResultDto> =>
  appFetch<SchemaDraftPublishResultDto>(
    `/api/schema-drafts/${encodeURIComponent(draftId)}/publish`,
    json("POST", { expectedDraftRevision }),
  );
