/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import type { ModelDto } from "../dtos";

export const getModels = async (): Promise<ModelDto[]> => {
  return appFetch<ModelDto[]>("/api/models/all");
};
