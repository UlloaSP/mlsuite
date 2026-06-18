/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import { json } from "../../core/services/json";
import type { PredictionResultFeedbackDto, CreatePredictionResultFeedbackRequest } from "../../schemas/dtos";

export const createSchemaReviewFeedback = (
  token: string,
  request: CreatePredictionResultFeedbackRequest,
) =>
  appFetch<PredictionResultFeedbackDto>(
    `/api/schema-review-links/token/${encodeURIComponent(token)}/feedback`,
    json("POST", request),
  );
