/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import { schemaReviewContextQueryOptions } from "@/api/review/review-queries";

export const useSchemaReviewContext = (token: string) =>
  useQuery(schemaReviewContextQueryOptions(token));
