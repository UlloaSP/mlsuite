/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import { json } from "../../core/services/json";
import type {
  PredictionResultFeedbackDto,
  UpdatePredictionResultFeedbackRequest,
} from "../../schemas/dtos";

export const updateSchemaReviewFeedback = (
  token: string,
  request: UpdatePredictionResultFeedbackRequest,
) =>
  appFetch<PredictionResultFeedbackDto>(
    `/api/schema-review-links/token/${encodeURIComponent(token)}/feedback`,
    json("PATCH", request),
  );
