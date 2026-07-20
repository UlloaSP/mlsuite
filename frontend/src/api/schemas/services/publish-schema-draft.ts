/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import { json } from "@/shared/api/http";
import type { SchemaDraftPublishResultDto } from "@/api/schemas/dtos";

export const publishSchemaDraft = (
  draftId: string,
  expectedDraftRevision: number,
): Promise<SchemaDraftPublishResultDto> =>
  appFetch<SchemaDraftPublishResultDto>(
    `/api/schema-drafts/${encodeURIComponent(draftId)}/publish`,
    json("POST", { expectedDraftRevision }),
  );
