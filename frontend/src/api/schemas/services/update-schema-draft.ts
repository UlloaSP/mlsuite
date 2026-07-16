/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import { json } from "../../core/services/json";
import type { SchemaDraftDto, UpdateSchemaDraftRequest } from "../dtos";

export const updateSchemaDraft = (
  draftId: string,
  req: UpdateSchemaDraftRequest,
): Promise<SchemaDraftDto> =>
  appFetch<SchemaDraftDto>(`/api/schema-drafts/${encodeURIComponent(draftId)}`, json("PUT", req));
