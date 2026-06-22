/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import type { ModelDto, ModelNameRequest } from "../dtos";

export const renameModel = async ({ id, name }: ModelNameRequest): Promise<ModelDto> => {
  const params = new URLSearchParams({ name });
  return appFetch<ModelDto>(`/api/models/${encodeURIComponent(id)}?${params.toString()}`, {
    method: "PATCH",
  });
};
