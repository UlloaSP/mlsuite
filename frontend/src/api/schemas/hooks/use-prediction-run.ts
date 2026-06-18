/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import * as schemaApi from "../services";
import { PREDICTION_RUN_QUERY_KEY } from "./query-keys";

export const usePredictionRun = (runId?: string) =>
  useQuery({
    queryKey: PREDICTION_RUN_QUERY_KEY(runId ?? ""),
    queryFn: () => schemaApi.getPredictionRun(runId ?? ""),
    enabled: Boolean(runId),
  });
