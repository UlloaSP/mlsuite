/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { PredictionRunDto } from "../../schemas/dtos";

export type SchemaReviewRunListItemDto = {
  selectionToken: string;
  run: PredictionRunDto;
  reviewState: "PENDING" | "REVISION" | "SUBMITTED";
  stateEnteredAt?: string | null;
  submittedAt?: string | null;
};
