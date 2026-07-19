/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/api/core/services/app-fetch";
import { json } from "@/api/core/services/json";
import type { SchemaDraftDto, UpdateSchemaDraftRequest } from "@/api/schemas/dtos";

export const updateSchemaDraft = (
  draftId: string,
  req: UpdateSchemaDraftRequest,
): Promise<SchemaDraftDto> =>
  appFetch<SchemaDraftDto>(`/api/schema-drafts/${encodeURIComponent(draftId)}`, json("PUT", req));
