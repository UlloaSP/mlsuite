/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import * as schemaApi from "../services";
import { PREDICTION_RESULT_FEEDBACK_QUERY_KEY } from "./query-keys";

export const usePredictionResultFeedback = (resultId?: string) =>
  useQuery({
    queryKey: PREDICTION_RESULT_FEEDBACK_QUERY_KEY(resultId ?? ""),
    queryFn: () => schemaApi.getPredictionResultFeedback(resultId ?? ""),
    enabled: Boolean(resultId),
    placeholderData: [],
  });
