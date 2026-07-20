/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import type { ModelDto, ModelNameRequest } from "@/api/models/dtos";

export const duplicateModel = async ({ id, name }: ModelNameRequest): Promise<ModelDto> => {
  const params = new URLSearchParams({ name });
  return appFetch<ModelDto>(
    `/api/models/${encodeURIComponent(id)}/duplicate?${params.toString()}`,
    { method: "POST" },
  );
};
