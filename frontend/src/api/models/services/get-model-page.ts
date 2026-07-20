/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import type { ModelPageDto, ModelPageRequest } from "@/api/models/dtos";

export const getModelPage = async (
  { page, search = "", size, sort = "updated", status = "active" }: ModelPageRequest,
  signal?: AbortSignal,
): Promise<ModelPageDto> => {
  const params = new URLSearchParams({
    page: String(page),
    search,
    size: String(size),
    sort,
    status,
  });
  return appFetch<ModelPageDto>(`/api/models?${params.toString()}`, { signal });
};
