/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import * as api from "../services";
import { SCHEMA_REVIEW_CONTEXT_QUERY_KEY } from "./query-keys";

export const useSchemaReviewContext = (token: string) =>
  useQuery({
    queryKey: SCHEMA_REVIEW_CONTEXT_QUERY_KEY(token),
    queryFn: () => api.getSchemaReviewContext(token),
  });
