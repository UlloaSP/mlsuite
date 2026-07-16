/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import type { SchemaDraftDiffDto } from "../dtos";

export const getSchemaDraftDiff = (draftId: string): Promise<SchemaDraftDiffDto> =>
  appFetch<SchemaDraftDiffDto>(`/api/schema-drafts/${encodeURIComponent(draftId)}/diff`);
