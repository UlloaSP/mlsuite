/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import * as api from "../services";
import { SCHEMA_REVIEW_RUN_QUERY_KEY } from "./query-keys";

export const useSchemaReviewRun = (token: string, runToken: string) =>
  useQuery({
    queryKey: SCHEMA_REVIEW_RUN_QUERY_KEY(token, runToken),
    queryFn: () => api.getSchemaReviewRunDetail(token, runToken),
    enabled: Boolean(token && runToken),
  });
