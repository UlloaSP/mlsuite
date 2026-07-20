/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import type { SchemaDto, SchemaNameRequest } from "@/api/schemas/dtos";

export const renameSchema = ({ id, name }: SchemaNameRequest): Promise<SchemaDto> => {
  const params = new URLSearchParams({ name });
  return appFetch<SchemaDto>(`/api/schemas/${encodeURIComponent(id)}?${params.toString()}`, {
    method: "PATCH",
  });
};
