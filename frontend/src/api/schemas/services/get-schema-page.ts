/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import type { SchemaPageDto, SchemaPageRequest } from "@/api/schemas/dtos";

export const getSchemaPage = (
  { page, search = "", size, sort = "updated", status = "active" }: SchemaPageRequest,
  signal?: AbortSignal,
): Promise<SchemaPageDto> => {
  const params = new URLSearchParams({
    page: String(page),
    search,
    size: String(size),
    sort,
    status,
  });
  return appFetch<SchemaPageDto>(`/api/schemas?${params.toString()}`, { signal });
};
