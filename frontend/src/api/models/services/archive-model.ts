/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import type { ModelDto } from "../dtos";

export const archiveModel = async (id: string): Promise<ModelDto> => {
  return appFetch<ModelDto>(`/api/models/${encodeURIComponent(id)}/archive`, { method: "POST" });
};
