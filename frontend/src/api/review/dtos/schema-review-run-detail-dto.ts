/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { PredictionResultFeedbackDto, PredictionRunDto } from "../../schemas/dtos";

export type SchemaReviewRunDetailDto = {
  run: PredictionRunDto;
  feedback: PredictionResultFeedbackDto[];
};
