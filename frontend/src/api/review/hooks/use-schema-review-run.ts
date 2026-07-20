/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import { schemaReviewRunQueryOptions } from "@/api/review/review-queries";

export const useSchemaReviewRun = (token: string, runToken: string) =>
  useQuery(schemaReviewRunQueryOptions(token, runToken));
