/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/api/core/services/app-fetch";
import type { ModelPageDto, ModelPageRequest } from "@/api/models/dtos";

export const getModelPage = async ({
  page,
  search = "",
  size,
  sort = "updated",
  status = "active",
}: ModelPageRequest): Promise<ModelPageDto> => {
  const params = new URLSearchParams({
    page: String(page),
    search,
    size: String(size),
    sort,
    status,
  });
  return appFetch<ModelPageDto>(`/api/models?${params.toString()}`);
};
