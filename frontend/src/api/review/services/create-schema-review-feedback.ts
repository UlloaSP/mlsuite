/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/api/core/services/app-fetch";
import { json } from "@/api/core/services/json";
import type {
  PredictionResultFeedbackDto,
  CreatePredictionResultFeedbackRequest,
} from "@/api/schemas/dtos";

export const createSchemaReviewFeedback = (
  token: string,
  request: CreatePredictionResultFeedbackRequest,
) =>
  appFetch<PredictionResultFeedbackDto>(
    `/api/schema-review-links/token/${encodeURIComponent(token)}/feedback`,
    json("POST", request),
  );
