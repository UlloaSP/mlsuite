/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/api/core/services/app-fetch";
import type { ModelDto, ModelNameRequest } from "@/api/models/dtos";

export const renameModel = async ({ id, name }: ModelNameRequest): Promise<ModelDto> => {
  const params = new URLSearchParams({ name });
  return appFetch<ModelDto>(`/api/models/${encodeURIComponent(id)}?${params.toString()}`, {
    method: "PATCH",
  });
};
