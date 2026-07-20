/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import { json } from "@/shared/api/http";
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
