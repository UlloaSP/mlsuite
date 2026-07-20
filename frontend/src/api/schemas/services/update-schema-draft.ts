/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import { json } from "@/shared/api/http";
import type { SchemaDraftDto, UpdateSchemaDraftRequest } from "@/api/schemas/dtos";

export const updateSchemaDraft = (
  draftId: string,
  req: UpdateSchemaDraftRequest,
): Promise<SchemaDraftDto> =>
  appFetch<SchemaDraftDto>(`/api/schema-drafts/${encodeURIComponent(draftId)}`, json("PUT", req));
