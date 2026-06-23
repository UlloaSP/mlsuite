/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { PredictionResultFeedbackType } from "./index";

export type CreatePredictionResultFeedbackRequest = {
  resultId: string;
  type: PredictionResultFeedbackType;
  order: number;
  value: unknown;
};
