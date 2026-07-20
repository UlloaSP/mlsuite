/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import { json } from "@/shared/api/http";
import type { CreateSchemaDraftRequest, SchemaDraftDto } from "@/api/schemas/dtos";

export const createSchemaDraft = (
  schemaId: string,
  req: CreateSchemaDraftRequest,
): Promise<SchemaDraftDto> =>
  appFetch<SchemaDraftDto>(
    `/api/schemas/${encodeURIComponent(schemaId)}/drafts`,
    json("POST", req),
  );
