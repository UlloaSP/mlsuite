/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import type { PredictionResultFeedbackDto } from "../dtos";

export const getPredictionResultFeedback = (
  resultId: string,
): Promise<PredictionResultFeedbackDto[]> =>
  appFetch<PredictionResultFeedbackDto[]>(
    `/api/prediction-result-feedback?resultId=${encodeURIComponent(resultId)}`,
  );
