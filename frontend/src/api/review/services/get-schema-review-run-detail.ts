/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import type { SchemaReviewRunDetailDto } from "@/api/review/dtos";

export const getSchemaReviewRunDetail = (token: string, runToken: string, signal?: AbortSignal) =>
  appFetch<SchemaReviewRunDetailDto>(
    `/api/schema-review-links/token/${encodeURIComponent(token)}/runs/${encodeURIComponent(runToken)}`,
    { signal },
  );
