/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQueries } from "@tanstack/react-query";
import * as schemaApi from "../services";
import type { PredictionRunDto } from "../dtos";
import { PREDICTION_RESULT_FEEDBACK_QUERY_KEY } from "./query-keys";

export const usePredictionRunFeedback = (run?: PredictionRunDto) => {
  const queries = useQueries({
    queries: (run?.results ?? []).map((result) => ({
      queryKey: PREDICTION_RESULT_FEEDBACK_QUERY_KEY(result.id),
      queryFn: () => schemaApi.getPredictionResultFeedback(result.id),
      enabled: Boolean(run),
      placeholderData: [],
    })),
  });
  return {
    data: queries.flatMap((query) => query.data ?? []),
    isLoading: queries.some((query) => query.isLoading),
    refetch: () => Promise.all(queries.map((query) => query.refetch())),
  };
};
