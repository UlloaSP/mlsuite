/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import { json } from "../../core/services/json";
import type { SchemaDraftPublishResultDto } from "../dtos";

export const publishSchemaDraft = (draftId: string): Promise<SchemaDraftPublishResultDto> =>
  appFetch<SchemaDraftPublishResultDto>(
    `/api/schema-drafts/${encodeURIComponent(draftId)}/publish`,
    json("POST"),
  );
