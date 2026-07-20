/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import type { SchemaDraftDto } from "@/api/schemas/dtos";

export const getSchemaDraft = (draftId: string, signal?: AbortSignal): Promise<SchemaDraftDto> =>
  appFetch<SchemaDraftDto>(`/api/schema-drafts/${encodeURIComponent(draftId)}`, { signal });
