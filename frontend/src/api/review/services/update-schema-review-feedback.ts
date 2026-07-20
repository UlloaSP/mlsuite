/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import { json } from "@/shared/api/http";
import type {
  PredictionResultFeedbackDto,
  UpdatePredictionResultFeedbackRequest,
} from "@/api/schemas/dtos";

export const updateSchemaReviewFeedback = (
  token: string,
  request: UpdatePredictionResultFeedbackRequest,
) =>
  appFetch<PredictionResultFeedbackDto>(
    `/api/schema-review-links/token/${encodeURIComponent(token)}/feedback`,
    json("PATCH", request),
  );
