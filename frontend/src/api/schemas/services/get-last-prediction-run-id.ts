/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";

export const getLastPredictionRunId = async (): Promise<number> => {
  const dto = await appFetch<{ lastId: number }>("/api/prediction-runs/last-id");
  return Number(dto.lastId ?? 0);
};
