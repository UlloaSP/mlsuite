/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import * as schemaApi from "../services";
import { BOOKMARK_PREDICTION_RUNS_QUERY_KEY } from "./query-keys";

export const usePredictionRunsForBookmark = (bookmarkId?: string) =>
  useQuery({
    queryKey: BOOKMARK_PREDICTION_RUNS_QUERY_KEY(bookmarkId ?? ""),
    queryFn: () => schemaApi.getPredictionRunsForBookmark(bookmarkId ?? ""),
    enabled: Boolean(bookmarkId),
    placeholderData: [],
  });
