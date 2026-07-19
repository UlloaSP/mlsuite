/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/api/core/services/app-fetch";
import { json } from "@/api/core/services/json";
import type { CreateSchemaDraftRequest, SchemaDraftDto } from "@/api/schemas/dtos";

export const createSchemaDraft = (
  schemaId: string,
  req: CreateSchemaDraftRequest,
): Promise<SchemaDraftDto> =>
  appFetch<SchemaDraftDto>(
    `/api/schemas/${encodeURIComponent(schemaId)}/drafts`,
    json("POST", req),
  );
