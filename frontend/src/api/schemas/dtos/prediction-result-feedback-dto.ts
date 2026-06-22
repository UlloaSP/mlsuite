/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { PredictionResultFeedbackType } from "./index";

export type PredictionResultFeedbackDto = {
  id: string;
  resultId: string;
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  type: PredictionResultFeedbackType;
  order: number;
  value: unknown;
  createdAt: string;
  updatedAt?: string;
};
