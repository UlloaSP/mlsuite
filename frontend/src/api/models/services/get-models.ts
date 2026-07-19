/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/api/core/services/app-fetch";
import type { ModelDto } from "@/api/models/dtos";

export const getModels = async (): Promise<ModelDto[]> => {
  return appFetch<ModelDto[]>("/api/models/all");
};
