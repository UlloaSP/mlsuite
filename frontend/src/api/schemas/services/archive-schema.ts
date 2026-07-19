/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/api/core/services/app-fetch";
import type { SchemaDto } from "@/api/schemas/dtos";

export const archiveSchema = (id: string): Promise<SchemaDto> => {
  return appFetch<SchemaDto>(`/api/schemas/${encodeURIComponent(id)}/archive`, {
    method: "POST",
  });
};
