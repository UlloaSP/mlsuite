/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/api/core/services/app-fetch";
import type { ModelDto } from "@/api/models/dtos";

export const archiveModel = async (id: string): Promise<ModelDto> => {
  return appFetch<ModelDto>(`/api/models/${encodeURIComponent(id)}/archive`, { method: "POST" });
};
