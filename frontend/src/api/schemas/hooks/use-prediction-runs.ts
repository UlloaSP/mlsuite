/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import * as schemaApi from "../services";
import { PREDICTION_RUNS_QUERY_KEY } from "./query-keys";

export const usePredictionRuns = (versionId?: string) =>
  useQuery({
    queryKey: PREDICTION_RUNS_QUERY_KEY(versionId ?? ""),
    queryFn: () => schemaApi.getPredictionRuns(versionId ?? ""),
    enabled: Boolean(versionId),
    placeholderData: [],
  });
