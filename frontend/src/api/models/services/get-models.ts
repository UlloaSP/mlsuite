/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import type { ModelDto } from "@/api/models/dtos";

export const getModels = async (signal?: AbortSignal): Promise<ModelDto[]> => {
  return appFetch<ModelDto[]>("/api/models/all", { signal });
};
