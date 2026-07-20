/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import type { PredictionResultFeedbackDto } from "@/api/schemas/dtos";

export const getPredictionResultFeedback = (
  resultId: string,
  signal?: AbortSignal,
): Promise<PredictionResultFeedbackDto[]> =>
  appFetch<PredictionResultFeedbackDto[]>(
    `/api/prediction-result-feedback?resultId=${encodeURIComponent(resultId)}`,
    { signal },
  );
