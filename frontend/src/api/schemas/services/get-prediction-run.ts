/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import type { PredictionRunDto } from "@/api/schemas/dtos";

export const getPredictionRun = (runId: string, signal?: AbortSignal): Promise<PredictionRunDto> =>
  appFetch<PredictionRunDto>(`/api/prediction-runs/${encodeURIComponent(runId)}`, { signal });
