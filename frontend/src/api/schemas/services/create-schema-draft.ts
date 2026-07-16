/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import { json } from "../../core/services/json";
import type { CreateSchemaDraftRequest, SchemaDraftDto } from "../dtos";

export const createSchemaDraft = (
  schemaId: string,
  req: CreateSchemaDraftRequest,
): Promise<SchemaDraftDto> =>
  appFetch<SchemaDraftDto>(
    `/api/schemas/${encodeURIComponent(schemaId)}/drafts`,
    json("POST", req),
  );
